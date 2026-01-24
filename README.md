# Local Web IDE

A local-first, browser-based IDE built with Next.js and Express.js. Features VS Code-like editing experience with Monaco Editor, real-time terminal access, and code execution capabilities.

## Features

- **Monaco Editor**: Full VS Code editor experience with syntax highlighting
- **File Explorer**: Tree-based workspace navigation
- **Live Terminal**: Real-time shell access via WebSocket
- **Code Execution**: Run JavaScript, Python, TypeScript, and shell scripts
- **Dark Theme**: VS Code-inspired color scheme

## Quick Start

```bash
# Install dependencies
npm install

# Start both servers (frontend on :3000, backend on :3001)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

- **frontend/**: Next.js application with React components
- **backend/**: Express.js server with filesystem, terminal, and execution APIs
- **workspace/**: Your local workspace directory (created automatically)

## Tech Stack

- **Frontend**: Next.js 14, React 19, Monaco Editor, TypeScript
- **Backend**: Express.js, WebSocket (ws), node-pty, TypeScript
- **Development**: npm workspaces, ESLint, Prettier

## Security

- Localhost-only access (no external connections)
- All filesystem operations restricted to workspace directory
- CORS limited to localhost origins
