import * as pty from 'node-pty';
import os from 'os';
import { workspaceService } from './workspace';

export type TerminalDataCallback = (terminalId: string, data: string) => void;
export type TerminalExitCallback = (terminalId: string, exitCode: number) => void;

interface TerminalSession {
    pty: pty.IPty;
    id: string;
}

export class TerminalService {
    private terminals: Map<string, TerminalSession> = new Map();
    private dataCallback: TerminalDataCallback | null = null;
    private exitCallback: TerminalExitCallback | null = null;

    /**
     * Set global callbacks for all terminals
     */
    setCallbacks(onData: TerminalDataCallback, onExit: TerminalExitCallback): void {
        this.dataCallback = onData;
        this.exitCallback = onExit;
    }

    /**
     * Create a new terminal session
     */
    createTerminal(terminalId: string): void {
        if (this.terminals.has(terminalId)) {
            console.warn(`Terminal ${terminalId} already exists`);
            return;
        }

        const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
        const workspacePath = workspaceService.getWorkspacePath();

        const ptyProcess = pty.spawn(shell, [], {
            name: 'xterm-color',
            cols: 80,
            rows: 24,
            cwd: workspacePath,
            env: process.env as { [key: string]: string },
        });

        const session: TerminalSession = {
            pty: ptyProcess,
            id: terminalId,
        };

        ptyProcess.onData((data) => {
            if (this.dataCallback) {
                this.dataCallback(terminalId, data);
            }
        });

        ptyProcess.onExit(({ exitCode }) => {
            console.log(`Terminal ${terminalId} exited with code: ${exitCode}`);
            if (this.exitCallback) {
                this.exitCallback(terminalId, exitCode);
            }
            this.terminals.delete(terminalId);
        });

        this.terminals.set(terminalId, session);
        console.log(`Terminal ${terminalId} created successfully`);
    }

    /**
     * Write input to a specific terminal
     */
    write(terminalId: string, data: string): void {
        const session = this.terminals.get(terminalId);
        if (!session) {
            throw new Error(`Terminal ${terminalId} not found`);
        }
        session.pty.write(data);
    }

    /**
     * Resize a specific terminal
     */
    resize(terminalId: string, cols: number, rows: number): void {
        const session = this.terminals.get(terminalId);
        if (session) {
            session.pty.resize(cols, rows);
        }
    }

    /**
     * Close a specific terminal
     */
    closeTerminal(terminalId: string): void {
        const session = this.terminals.get(terminalId);
        if (session) {
            session.pty.kill();
            this.terminals.delete(terminalId);
            console.log(`Terminal ${terminalId} closed`);
        }
    }

    /**
     * Close all terminals
     */
    closeAll(): void {
        for (const [id, session] of this.terminals) {
            session.pty.kill();
            console.log(`Terminal ${id} closed`);
        }
        this.terminals.clear();
    }

    /**
     * Get all terminal IDs
     */
    getTerminalIds(): string[] {
        return Array.from(this.terminals.keys());
    }

    /**
     * Check if a terminal exists
     */
    hasTerminal(terminalId: string): boolean {
        return this.terminals.has(terminalId);
    }
}

export const terminalService = new TerminalService();
