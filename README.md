# CodeBlocking - Online IDE

A modern, web-based IDE inspired by VSCode and Replit. Build, edit, and run code directly in your browser with a real terminal.

![CodeBlocking IDE](https://img.shields.io/badge/status-complete-brightgreen) ![Next.js](https://img.shields.io/badge/Next.js-14-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

## ✨ Features

- **📁 File Explorer** - Tree view with create, delete, rename files & folders
- **📝 Monaco Editor** - VSCode's editor with syntax highlighting & IntelliSense
- **💾 Autosave** - Debounced auto-save (1.5s after typing stops)
- **🖥️ Real Terminal** - Fully functional bash terminal via WebSocket
- **📐 Resizable Panels** - Drag to resize sidebar and terminal
- **🎨 Dark Theme** - Modern dark UI with smooth animations
- **⌨️ Keyboard Shortcuts** - Platform-aware (Cmd/Ctrl+S to save)

## 🏗️ Architecture

```
codeblocking/
├── frontend/                 # Next.js 14 + TypeScript
│   ├── src/
│   │   ├── app/page.tsx     # Main page
│   │   ├── components/
│   │   │   ├── layout/      # IdeLayout (resizable panels)
│   │   │   ├── explorer/    # FileExplorer (file tree, CRUD)
│   │   │   ├── editor/      # CodeEditor (Monaco, tabs, autosave)
│   │   │   └── terminal/    # TerminalPanel (xterm.js)
│   │   ├── store/           # Zustand state management
│   │   └── lib/             # API client, Socket client
│   └── package.json
├── backend/                  # Express.js + TypeScript
│   ├── src/
│   │   ├── index.ts         # Server + Socket.IO
│   │   ├── routes/files.ts  # File CRUD API
│   │   ├── services/
│   │   │   ├── fileSystem.ts  # File operations
│   │   │   └── terminal.ts    # PTY management
│   │   └── middleware/
│   └── package.json
└── README.md
```

## 🛠️ Tech Stack

| Frontend | Backend |
|----------|---------|
| Next.js 14 | Express.js |
| TypeScript | TypeScript |
| Monaco Editor | Socket.IO |
| xterm.js | node-pty |
| Zustand | REST API |
| Tailwind CSS | Sandboxed FS |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

### Installation

```bash
# Clone the repo
git clone <repository-url>
cd codeblocking

# Install frontend
cd frontend && npm install

# Install backend
cd ../backend && npm install
```

### Run Development Servers

```bash
# Terminal 1 - Backend (port 3001)
cd backend && npm run dev

# Terminal 2 - Frontend (port 3000)
cd frontend && npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/files/tree` | GET | Get file tree |
| `/api/files/read?path=` | GET | Read file content |
| `/api/files/write` | POST | Save file content |
| `/api/files/create` | POST | Create file/folder |
| `/api/files/delete?path=` | DELETE | Delete file/folder |
| `/api/files/rename` | POST | Rename file/folder |
| `/api/health` | GET | Health check |

**WebSocket Events:**
- `terminal:create` - Create PTY session
- `terminal:input` - Send input to terminal
- `terminal:output` - Receive terminal output
- `terminal:resize` - Resize terminal

## 📝 Environment Variables

### Frontend (`frontend/.env`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Backend (`backend/.env`)
```env
PORT=3001
FRONTEND_URL=http://localhost:3000
WORKSPACE_DIR=./workspace
```

## 🎯 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/⌘ + S` | Save file |
| Click file | Open in editor |
| Drag divider | Resize panels |

## 📄 License

MIT
