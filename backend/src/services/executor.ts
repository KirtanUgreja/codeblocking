import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { workspaceService } from './workspace';
import { ExecutionRequest, ExecutionResponse } from '../types';
import { AppError } from '../middleware/error';
import { websocketService } from './websocket';

export class ExecutorService {
    private currentProcess: ChildProcess | null = null;
    private isExecuting = false;

    /**
     * Detect runtime command based on file extension
     */
    private getCommand(filePath: string): { command: string; args: string[] } {
        const ext = path.extname(filePath).toLowerCase();

        switch (ext) {
            case '.js':
                return { command: 'node', args: [filePath] };
            case '.py':
                return { command: 'python3', args: [filePath] };
            case '.ts':
                return { command: 'tsx', args: [filePath] };
            case '.sh':
                return { command: 'bash', args: [filePath] };
            default:
                throw new AppError(400, `Unsupported file type: ${ext}`);
        }
    }

    /**
     * Execute a file
     */
    execute(request: ExecutionRequest): ExecutionResponse {
        if (this.isExecuting) {
            throw new AppError(409, 'Another execution is already in progress');
        }

        const workspacePath = workspaceService.getWorkspacePath();
        const { command, args } = request.command
            ? { command: request.command.split(' ')[0], args: request.command.split(' ').slice(1) }
            : this.getCommand(request.filePath);

        const fullPath = path.resolve(workspacePath, request.filePath);

        // Validate file is in workspace
        if (!fullPath.startsWith(workspacePath)) {
            throw new AppError(403, 'Access denied: File outside workspace');
        }

        try {
            this.currentProcess = spawn(command, args, {
                cwd: workspacePath,
                env: process.env,
            });

            this.isExecuting = true;

            // Handle stdout
            this.currentProcess.stdout?.on('data', (data: Buffer) => {
                const output = data.toString();
                websocketService.broadcastExecutionOutput('stdout', output);
            });

            // Handle stderr
            this.currentProcess.stderr?.on('data', (data: Buffer) => {
                const output = data.toString();
                websocketService.broadcastExecutionOutput('stderr', output);
            });

            // Handle exit
            this.currentProcess.on('exit', (code) => {
                const exitCode = code ?? 0;
                websocketService.broadcastExecutionOutput('exit', '', exitCode);
                this.isExecuting = false;
                this.currentProcess = null;
                console.log(`Execution completed with exit code: ${exitCode}`);
            });

            // Handle errors
            this.currentProcess.on('error', (error) => {
                console.error('Execution error:', error);
                websocketService.broadcastExecutionOutput('stderr', `Error: ${error.message}\n`);
                this.isExecuting = false;
                this.currentProcess = null;
            });

            return {
                success: true,
                message: 'Execution started',
                processId: this.currentProcess.pid?.toString(),
            };
        } catch (error) {
            this.isExecuting = false;
            throw new AppError(500, `Failed to execute: ${(error as Error).message}`);
        }
    }

    /**
     * Stop current execution
     */
    stop(): ExecutionResponse {
        if (!this.isExecuting || !this.currentProcess) {
            throw new AppError(400, 'No execution in progress');
        }

        this.currentProcess.kill('SIGTERM');

        // Force kill after 2 seconds if not terminated
        setTimeout(() => {
            if (this.currentProcess && !this.currentProcess.killed) {
                this.currentProcess.kill('SIGKILL');
            }
        }, 2000);

        this.isExecuting = false;
        this.currentProcess = null;

        return {
            success: true,
            message: 'Execution stopped',
        };
    }

    /**
     * Check if currently executing
     */
    isRunning(): boolean {
        return this.isExecuting;
    }
}

export const executorService = new ExecutorService();
