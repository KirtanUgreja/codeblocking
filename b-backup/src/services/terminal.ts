// Terminal Service - Manages PTY instances for terminal emulation

import * as pty from 'node-pty';
import { Server as SocketIOServer, Socket } from 'socket.io';
import os from 'os';

interface TerminalSession {
    pty: pty.IPty;
    socket: Socket;
}

class TerminalService {
    private sessions: Map<string, TerminalSession> = new Map();
    private io: SocketIOServer | null = null;

    /**
     * Initialize the terminal service with Socket.IO
     */
    initialize(io: SocketIOServer): void {
        this.io = io;

        io.on('connection', (socket: Socket) => {
            console.log(`Client connected: ${socket.id}`);

            socket.on('terminal:create', () => this.createTerminal(socket));
            socket.on('terminal:input', (data: string) => this.handleInput(socket.id, data));
            socket.on('terminal:resize', (data: { cols: number; rows: number }) => this.handleResize(socket.id, data));
            socket.on('disconnect', () => this.handleDisconnect(socket.id));
        });
    }

    /**
     * Create a new terminal session
     */
    private createTerminal(socket: Socket): void {
        const shell = os.platform() === 'win32' ? 'powershell.exe' : process.env.SHELL || 'bash';
        const workspaceDir = process.env.WORKSPACE_DIR || process.cwd() + '/workspace';

        try {
            const ptyProcess = pty.spawn(shell, [], {
                name: 'xterm-256color',
                cols: 80,
                rows: 24,
                cwd: workspaceDir,
                env: {
                    ...process.env,
                    TERM: 'xterm-256color',
                } as { [key: string]: string },
            });

            // Store the session
            this.sessions.set(socket.id, { pty: ptyProcess, socket });

            // Send terminal output to client
            ptyProcess.onData((data: string) => {
                socket.emit('terminal:output', data);
            });

            // Handle terminal exit
            ptyProcess.onExit(({ exitCode, signal }) => {
                console.log(`Terminal exited: code=${exitCode}, signal=${signal}`);
                socket.emit('terminal:exit', { exitCode, signal });
                this.sessions.delete(socket.id);
            });

            // Send ready signal
            socket.emit('terminal:ready');
            console.log(`Terminal created for: ${socket.id}`);
        } catch (error) {
            console.error('Failed to create terminal:', error);
            socket.emit('terminal:error', { message: 'Failed to create terminal' });
        }
    }

    /**
     * Handle input from client
     */
    private handleInput(socketId: string, data: string): void {
        const session = this.sessions.get(socketId);
        if (session) {
            session.pty.write(data);
        }
    }

    /**
     * Handle terminal resize
     */
    private handleResize(socketId: string, { cols, rows }: { cols: number; rows: number }): void {
        const session = this.sessions.get(socketId);
        if (session) {
            session.pty.resize(cols, rows);
        }
    }

    /**
     * Handle client disconnect
     */
    private handleDisconnect(socketId: string): void {
        const session = this.sessions.get(socketId);
        if (session) {
            session.pty.kill();
            this.sessions.delete(socketId);
            console.log(`Terminal destroyed for: ${socketId}`);
        }
    }

    /**
     * Get active session count
     */
    getActiveSessionCount(): number {
        return this.sessions.size;
    }
}

export const terminalService = new TerminalService();
