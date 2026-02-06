# Zero-Latency Git-Sync Pipeline

> Real-time container pre-warming and automatic code persistence for CodeBlocking IDE.

---

## Pipeline Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        ZERO-LATENCY GIT-SYNC PIPELINE                         │
└──────────────────────────────────────────────────────────────────────────────┘

                          USER JOURNEY
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
  ┌───────────┐        ┌───────────┐        ┌───────────┐
  │  TRIGGER  │        │   CODE    │        │  TRIGGER  │
  │     A     │───────▶│   IN IDE  │───────▶│     B     │
  │Pre-warming│        │           │        │Auto-Push  │
  └───────────┘        └───────────┘        └───────────┘
        │                                         │
        ▼                                         ▼
  ┌───────────────────────────────────────────────────────┐
  │              DOCKER CONTAINER LIFECYCLE               │
  │  ┌─────────┐    ┌──────────┐    ┌─────────────────┐  │
  │  │ SPAWN   │───▶│  ACTIVE  │───▶│ GRACEFUL EXIT   │  │
  │  │(in bg)  │    │(terminal)│    │(git push first) │  │
  │  └─────────┘    └──────────┘    └─────────────────┘  │
  └───────────────────────────────────────────────────────┘
```

---

## Trigger A: Pre-warming (Container Spawn on Click)

**Goal:** Container is running before user reaches the IDE.

### Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  DASHBOARD                                                       │
│  ┌───────────────┐                                              │
│  │ [New Project] │ ─── onClick ───┐                             │
│  │ [Import Repo] │                │                             │
│  └───────────────┘                ▼                             │
│                          ┌─────────────────┐                    │
│                          │ 1. Create in DB │                    │
│                          │ 2. Clone repo   │                    │
│                          │ 3. PREWARM ━━━━━│━━━━┓ (async)       │
│                          │ 4. Navigate     │    ┃               │
│                          └─────────────────┘    ┃               │
│                                                  ┃               │
└──────────────────────────────────────────────────┃───────────────┘
                                                   ┃
                                                   ▼
                                    ┌─────────────────────────┐
                                    │  BACKEND (background)   │
                                    │  spawnContainer(...)    │
                                    │  Container: STARTING... │
                                    └─────────────────────────┘
                                                   │
                                    ~500ms-2s later│
                                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  IDE PAGE                                                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Terminal connects → Container ALREADY RUNNING → INSTANT ✓  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation

**Frontend:** `frontend/src/components/dashboard/DashboardView.tsx`
```typescript
const handleCreateRepo = async () => {
    // ... existing logic
    if (res.ok) {
        const data = await res.json();
        
        // 🔥 Pre-warm container (fire and forget)
        fetch(`${API_URL}/api/projects/${data.project.id}/prewarm`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` },
            body: JSON.stringify({ environment: newRepoEnvironment })
        });
        
        router.push(`/ide/${data.project.id}`);
    }
};
```

**Backend:** `backend/src/routes/projects.ts`
```typescript
router.post('/:id/prewarm', async (req, res) => {
    const { id } = req.params;
    const { environment } = req.body;
    const projectPath = getProjectPath(req.user.id, id);
    
    // Non-blocking spawn
    spawnContainer(req.user.id, id, environment || 'base', projectPath);
    
    res.json({ status: 'warming' });
});
```

---

## Trigger B: Auto-Push on Exit

**Goal:** Code is saved to GitHub before container dies.

### Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  USER CLOSES TAB / NAVIGATES AWAY                                │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket disconnect
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND: terminal.ts                                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  socket.on('disconnect', async () => {                      │ │
│  │      1. End terminal stream                                 │ │
│  │      2. Execute git add/commit/push ━━━━┓                   │ │
│  │      3. Wait for push to complete       ┃                   │ │
│  │      4. Stop container                  ┃                   │ │
│  │  })                                     ┃                   │ │
│  └─────────────────────────────────────────┃───────────────────┘ │
│                                             ┃                    │
└─────────────────────────────────────────────┃────────────────────┘
                                              ┃
                                              ▼
                             ┌────────────────────────────────┐
                             │  CONTAINER                      │
                             │  ┌──────────────────────────┐  │
                             │  │ git add .                 │  │
                             │  │ git commit -m "Auto-save" │  │
                             │  │ git push origin main      │  │
                             │  └──────────────────────────┘  │
                             │            │                    │
                             │            ▼                    │
                             │      Push complete              │
                             │            │                    │
                             │            ▼                    │
                             │      Container stops            │
                             └────────────────────────────────┘
```

### Implementation

**Backend:** `backend/src/services/terminal.ts`
```typescript
socket.on('disconnect', async () => {
    const session = sessions.get(socket.id);
    if (session) {
        session.stream?.end();
        sessions.delete(socket.id);
        
        // Auto-push changes
        const projectPath = getProjectPath(session.userId, session.projectId);
        try {
            await pushRepository(projectPath, `Auto-save: ${new Date().toISOString()}`);
        } catch (e) {
            // Ignore errors (no changes, etc.)
        }
        
        // Grace period before cleanup
        setTimeout(async () => {
            const hasOtherSession = Array.from(sessions.values())
                .some(s => s.projectId === session.projectId);
            if (!hasOtherSession) {
                await stopContainer(session.userId, session.projectId);
            }
        }, 5000);
    }
});
```

---

## Race Condition Handling

### Problem
Container must stay alive long enough for `git push` to complete.

### Solution
```
┌─────────────────────────────────────────────────────────────────┐
│  GRACEFUL SHUTDOWN SEQUENCE                                      │
│                                                                  │
│  1. WebSocket disconnects                                        │
│  2. Backend starts git push (async, from HOST, not container)   │
│  3. Git push completes (1-5 seconds)                            │
│  4. Grace period (5 seconds for late reconnects)                │
│  5. Container stops                                              │
│                                                                  │
│  Total window: ~10 seconds                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Potential Bottlenecks

| Issue | Risk | Mitigation |
|-------|------|------------|
| **GitHub Rate Limits** | Low | Push only on disconnect, not continuously |
| **Docker Socket Exhaustion** | Very Low | Unix sockets handle 1000+ connections; target is 15 users |
| **Zombie Containers** | High | Add periodic cleanup (see below) |
| **Push Conflicts** | Low | Each user has isolated workspace clone |

### Zombie Container Cleanup

**Backend:** `backend/src/services/container.ts`
```typescript
// Run every 30 seconds
setInterval(async () => {
    const containers = await docker.listContainers({
        filters: { label: ['codeblocking.userId'] }
    });
    
    for (const c of containers) {
        const key = `${c.Labels['codeblocking.userId']}-${c.Labels['codeblocking.projectId']}`;
        const hasSession = [...sessions.values()].some(s => `${s.userId}-${s.projectId}` === key);
        
        // Kill orphaned containers older than 5 minutes
        if (!hasSession) {
            const age = Date.now() - c.Created * 1000;
            if (age > 5 * 60 * 1000) {
                await docker.getContainer(c.Id).stop();
            }
        }
    }
}, 30000);
```

---

## Files to Modify

| File | Change |
|------|--------|
| `frontend/src/components/dashboard/DashboardView.tsx` | Add pre-warm API call |
| `backend/src/routes/projects.ts` | Add `/prewarm` endpoint |
| `backend/src/services/terminal.ts` | Add auto-push on disconnect |
| `backend/src/services/container.ts` | Add zombie cleanup interval |

---

## Status

- [ ] Trigger A: Pre-warming
- [ ] Trigger B: Auto-Push on Exit
- [ ] Zombie Container Cleanup
- [ ] Integration Testing

---

*Created: 2026-02-04*
