"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeTerminalService = initializeTerminalService;
exports.getActiveSessionCount = getActiveSessionCount;
exports.cleanupTerminals = cleanupTerminals;
const dockerode_1 = __importDefault(require("dockerode"));
const container_1 = require("./container");
const git_1 = require("./git");
const docker = new dockerode_1.default();
const sessions = new Map();
function initializeTerminalService(io) {
    io.on('connection', (socket) => {
        console.log('Terminal socket connected:', socket.id);
        socket.on('terminal:create', async (data) => {
            try {
                // Get user info from socket auth
                const userId = socket.handshake.auth?.userId || 'anonymous';
                const projectId = data.projectId;
                if (!projectId) {
                    socket.emit('terminal:error', { message: 'Project ID required' });
                    return;
                }
                // Get project path and environment
                const projectPath = (0, git_1.getProjectPath)(projectId);
                // Get or spawn container
                let containerInfo = await (0, container_1.getContainer)(userId, projectId);
                if (!containerInfo) {
                    // Need project environment - default to 'base'
                    const environment = socket.handshake.auth?.environment || 'base';
                    containerInfo = await (0, container_1.spawnContainer)(userId, projectId, environment, projectPath);
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
                stream.on('data', (chunk) => {
                    socket.emit('terminal:output', chunk.toString());
                });
                stream.on('end', () => {
                    socket.emit('terminal:exit', { exitCode: 0 });
                    sessions.delete(socket.id);
                });
                stream.on('error', (err) => {
                    console.error('Terminal stream error:', err);
                    socket.emit('terminal:error', { message: err.message });
                });
                // Send port info to client
                const ports = {};
                containerInfo.ports.forEach((hostPort, containerPort) => {
                    ports[containerPort] = hostPort;
                });
                socket.emit('terminal:ready', { ports });
                console.log(`Terminal created for ${userId}/${projectId}`);
            }
            catch (error) {
                console.error('Error creating terminal:', error);
                socket.emit('terminal:error', { message: 'Failed to create terminal' });
            }
        });
        socket.on('terminal:input', (data) => {
            const session = sessions.get(socket.id);
            if (session?.stream) {
                session.stream.write(data);
            }
        });
        socket.on('terminal:resize', (data) => {
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
function getActiveSessionCount() {
    return sessions.size;
}
async function cleanupTerminals() {
    for (const [socketId, session] of sessions) {
        session.stream?.end();
        sessions.delete(socketId);
    }
}
