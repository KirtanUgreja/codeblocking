// Terminal service for managing Docker container terminals via Socket.IO
import { Server as SocketIOServer, Socket } from 'socket.io';
import Docker from 'dockerode';
import { Duplex } from 'stream';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { spawnContainer, getContainer, stopContainer } from './container';
import { getProjectPath } from './git';

// Auto-detect Docker socket (Docker Desktop uses a different path on Linux)
function getDockerSocket(): string {
    const homeDir = os.homedir();
    const desktopSocket = path.join(homeDir, '.docker/desktop/docker.sock');

    if (fs.existsSync(desktopSocket)) {
        return desktopSocket;
    }

    return '/var/run/docker.sock';
}

const docker = new Docker({ socketPath: getDockerSocket() });

interface TerminalSession {
    userId: string;
    projectId: string;
    exec: Docker.Exec;
    stream: Duplex | null;
    socket: Socket;
}

const sessions: Map<string, TerminalSession> = new Map();

export function initializeTerminalService(io: SocketIOServer): void {
    io.on('connection', (socket: Socket) => {
        console.log('Terminal socket connected:', socket.id);

        socket.on('terminal:create', async (data: { projectId: string }) => {
            try {
                // Get user info from socket auth
                const userId = socket.handshake.auth?.userId || 'anonymous';
                const projectId = data.projectId;

                if (!projectId) {
                    socket.emit('terminal:error', { message: 'Project ID required' });
                    return;
                }

                // Get project path and environment
                const projectPath = getProjectPath(projectId);

                // Get or spawn container
                let containerInfo = await getContainer(userId, projectId);

                if (!containerInfo) {
                    // Need project environment - default to 'base'
                    const environment = socket.handshake.auth?.environment || 'base';
                    containerInfo = await spawnContainer(userId, projectId, environment, projectPath);
                }

                const container = docker.getContainer(containerInfo.containerId);

                // Create exec session for terminal
                const exec = await container.exec({
                    Cmd: ['/bin/bash'],
                    AttachStdin: true,
                    AttachStdout: true,
                    AttachStderr: true,
                    Tty: true,
                });

                const stream = await exec.start({
                    hijack: true,
                    stdin: true,
                    Tty: true,
                });

                // Store session
                sessions.set(socket.id, {
                    userId,
                    projectId,
                    exec,
                    stream,
                    socket,
                });

                // Forward container output to client
                stream.on('data', (chunk: Buffer) => {
                    socket.emit('terminal:output', chunk.toString());
                });

                stream.on('end', () => {
                    socket.emit('terminal:exit', { exitCode: 0 });
                    sessions.delete(socket.id);
                });

                stream.on('error', (err: Error | unknown) => {
                    const errorMessage = err instanceof Error
                        ? err.message
                        : typeof err === 'string'
                            ? err
                            : 'Unknown terminal stream error';
                    console.error('Terminal stream error:', err);
                    socket.emit('terminal:error', { message: errorMessage || 'Stream error occurred' });
                });

                // Send port info to client
                const ports: Record<number, number> = {};
                containerInfo.ports.forEach((hostPort, containerPort) => {
                    ports[containerPort] = hostPort;
                });

                socket.emit('terminal:ready', { ports });
                console.log(`Terminal created for ${userId}/${projectId}`);
            } catch (error) {
                const errorMessage = error instanceof Error
                    ? error.message
                    : typeof error === 'string'
                        ? error
                        : 'Failed to create terminal';
                console.error('Error creating terminal:', error);
                socket.emit('terminal:error', { message: errorMessage });
            }
        });

        socket.on('terminal:input', (data: string) => {
            const session = sessions.get(socket.id);
            if (session?.stream) {
                session.stream.write(data);
            }
        });

        socket.on('terminal:resize', (data: { cols: number; rows: number }) => {
            const session = sessions.get(socket.id);
            if (session?.exec) {
                // Docker exec resize
                session.exec.resize({ w: data.cols, h: data.rows }).catch((err) => {
                    console.error('Error resizing terminal:', err);
                });
            }
        });

        socket.on('disconnect', () => {
            const session = sessions.get(socket.id);
            if (session) {
                session.stream?.end();
                sessions.delete(socket.id);
                console.log('Terminal disconnected:', socket.id);
            }
        });
    });

    console.log('Terminal service initialized');
}

export function getActiveSessionCount(): number {
    return sessions.size;
}

export async function cleanupTerminals(): Promise<void> {
    for (const [socketId, session] of sessions) {
        session.stream?.end();
        sessions.delete(socketId);
    }
}
