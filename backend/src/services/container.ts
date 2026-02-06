// Docker container service for managing IDE environments
import Docker from 'dockerode';
import path from 'path';
import os from 'os';
import fs from 'fs';

// Auto-detect Docker socket (Docker Desktop uses a different path on Linux)
function getDockerSocket(): string {
    const homeDir = os.homedir();
    const desktopSocket = path.join(homeDir, '.docker/desktop/docker.sock');

    // Check if Docker Desktop socket exists
    if (fs.existsSync(desktopSocket)) {
        return desktopSocket;
    }

    // Check for Windows named pipe
    if (os.platform() === 'win32') {
        return '//./pipe/docker_engine';
    }

    // Fallback to standard Docker socket
    return '/var/run/docker.sock';
}

const docker = new Docker({ socketPath: getDockerSocket() });

export async function pingDocker(): Promise<boolean> {
    try {
        await docker.ping();
        return true;
    } catch (error) {
        return false;
    }
}

// Environment to Docker image mapping
// We use standard images to ensure broad compatibility without needing to build custom images
const ENVIRONMENT_IMAGES: Record<string, string> = {
    python: 'python:3.11-alpine',
    node: 'node:20-alpine',
    java: 'openjdk:17-alpine',
    base: 'node:20-alpine',
};

// Port range for container bindings (21000+ to avoid conflicts)
const PORT_RANGE_START = 21000;
const PORT_RANGE_SIZE = 10;

interface ContainerInfo {
    containerId: string;
    environment: string;
    ports: Map<number, number>; // container port -> host port
    projectPath: string;
}

// Track active containers: userId-projectId -> ContainerInfo
const activeContainers: Map<string, ContainerInfo> = new Map();
// Track containers currently being spawned to prevent cleanup race conditions
const pendingContainerIds: Set<string> = new Set();

// Track used host ports
const usedPorts: Set<number> = new Set();

function getContainerKey(userId: string, projectId: string): string {
    return `${userId}-${projectId}`;
}

// Check if a port is actually available on the system
async function isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const net = require('net');
        const server = net.createServer();

        server.listen(port, '0.0.0.0');

        server.on('listening', () => {
            server.close();
            resolve(true);
        });

        server.on('error', () => {
            resolve(false);
        });
    });
}

async function findAvailablePort(): Promise<number> {
    for (let port = PORT_RANGE_START; port < PORT_RANGE_START + 1000; port++) {
        if (!usedPorts.has(port) && await isPortAvailable(port)) {
            usedPorts.add(port);
            return port;
        }
    }
    throw new Error('No available ports');
}

function releasePort(port: number): void {
    usedPorts.delete(port);
}

export async function getContainer(userId: string, projectId: string): Promise<ContainerInfo | null> {
    const key = getContainerKey(userId, projectId);
    const info = activeContainers.get(key);

    if (!info) return null;

    // Verify container is still running
    try {
        const container = docker.getContainer(info.containerId);
        const data = await container.inspect();
        if (data.State.Running) {
            return info;
        }
    } catch (error) {
        // Container no longer exists
        activeContainers.delete(key);
    }

    return null;
}

export async function forceStopContainer(userId: string, projectId: string): Promise<void> {
    await stopContainer(userId, projectId);
}

export async function spawnContainer(
    userId: string,
    projectId: string,
    environment: string,
    projectPath: string
): Promise<ContainerInfo> {
    const key = getContainerKey(userId, projectId);

    // Check if container already exists
    const existing = await getContainer(userId, projectId);
    if (existing) {
        return existing;
    }

    const imageName = ENVIRONMENT_IMAGES[environment] || 'node:20-alpine';

    // Pull image if not exists
    try {
        await docker.getImage(imageName).inspect();
    } catch (error) {
        console.log(`Pulling image ${imageName}...`);
        await new Promise((resolve, reject) => {
            docker.pull(imageName, (err: any, stream: any) => {
                if (err) return reject(err);
                docker.modem.followProgress(stream, (err: any, output: any) => {
                    if (err) return reject(err);
                    console.log(`Image ${imageName} pulled successfully`);
                    resolve(output);
                });
            });
        });
    }

    // Find available ports for common dev server ports
    const portBindings: Record<string, { HostPort: string }[]> = {};
    const ports = new Map<number, number>();

    // Bind ports 3000-3010 from container to available host ports
    for (let containerPort = 5000; containerPort <= 5010; containerPort++) {
        const hostPort = await findAvailablePort();
        portBindings[`${containerPort}/tcp`] = [{ HostPort: hostPort.toString() }];
        ports.set(containerPort, hostPort);
    }

    // Ensure project directory exists and get absolute path
    let absoluteProjectPath = path.resolve(projectPath);

    // Fix for Windows Docker mounting: ensure forward slashes and proper drive casing
    if (os.platform() === 'win32') {
        absoluteProjectPath = absoluteProjectPath.replace(/\\/g, '/');
        // Ensure drive letter is lowercase (often required for WSL2/Docker backend)
        if (absoluteProjectPath.match(/^[a-zA-Z]:\//)) {
            absoluteProjectPath = absoluteProjectPath.charAt(0).toLowerCase() + absoluteProjectPath.slice(1);
        }
    }

    console.log(`Spawning container with image: ${imageName} for path: ${absoluteProjectPath}`);

    // Ensure image exists or pull it
    try {
        const image = docker.getImage(imageName);
        const imageInfo = await image.inspect().catch(() => null);
        if (!imageInfo) {
            console.log(`Image ${imageName} not found locally, pulling...`);
            await new Promise((resolve, reject) => {
                docker.pull(imageName, (err: any, stream: any) => {
                    if (err) return reject(err);
                    docker.modem.followProgress(stream, onFinished, onProgress);
                    function onFinished(err: any, output: any) {
                        if (err) return reject(err);
                        resolve(output);
                    }
                    function onProgress(event: any) {
                        // console.log(event);
                    }
                });
            });
            console.log(`Image ${imageName} pulled successfully`);
        }
    } catch (pullError) {
        console.error(`Error checking/pulling image ${imageName}:`, pullError);
    }

    try {
        // Create container
        const container = await docker.createContainer({
            Image: imageName,
            Cmd: ['/bin/sh'],
            Tty: true,
            OpenStdin: true,
            WorkingDir: '/workspace',
            ExposedPorts: Object.keys(portBindings).reduce((acc, port) => ({ ...acc, [port]: {} }), {}),
            HostConfig: {
                Binds: [`${absoluteProjectPath}:/workspace:rw`],
                PortBindings: portBindings,
                NetworkMode: 'bridge',
                // Resource limits
                Memory: 512 * 1024 * 1024, // 512MB
                CpuShares: 256, // 25% of CPU
            },
            Labels: {
                'codeblocking.userId': userId,
                'codeblocking.projectId': projectId,
            },
            Env: [
                'TERM=xterm-256color',
                'PS1=\\u@\\h:\\w\\$ ',  // Set a clear prompt showing current directory
            ],
        });

        // Mark as pending so cleanup doesn't delete it
        pendingContainerIds.add(container.id);

        try {
            await container.start();

            // Wait a brief moment to ensure container is fully up
            await new Promise(resolve => setTimeout(resolve, 500));

            const info: ContainerInfo = {
                containerId: container.id,
                environment,
                ports,
                projectPath: absoluteProjectPath,
            };

            activeContainers.set(key, info);
            console.log(`Container started for ${key}: ${container.id.substring(0, 12)}`);
            console.log(`Port mappings:`, Array.from(ports.entries()).map(([c, h]) => `${c}->${h}`).join(', '));

            return info;
        } finally {
            // Remove from pending whether success or fail
            pendingContainerIds.delete(container.id);
        }
    } catch (error) {
        // Release ports if container creation failed
        ports.forEach((hostPort) => releasePort(hostPort));
        throw error;
    }
}

export async function execInContainer(
    userId: string,
    projectId: string
): Promise<Docker.Exec | null> {
    const info = await getContainer(userId, projectId);
    if (!info) return null;

    const container = docker.getContainer(info.containerId);

    const exec = await container.exec({
        Cmd: ['/bin/bash'],
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true,
    });

    return exec;
}

export async function stopContainer(userId: string, projectId: string): Promise<void> {
    const key = getContainerKey(userId, projectId);
    const info = activeContainers.get(key);

    if (!info) return;

    try {
        const container = docker.getContainer(info.containerId);
        await container.stop({ t: 5 });
        await container.remove();
        console.log(`Container stopped for ${key}`);
    } catch (error) {
        console.error(`Error stopping container ${key}:`, error);
    }

    // Release ports
    info.ports.forEach((hostPort) => releasePort(hostPort));
    activeContainers.delete(key);
}

export async function cleanupAllContainers(): Promise<void> {
    console.log('Cleaning up all containers...');

    const keys = Array.from(activeContainers.keys());
    for (const key of keys) {
        const [userId, projectId] = key.split('-');
        await stopContainer(userId, projectId);
    }

    // Also clean up any orphaned codeblocking containers
    const containers = await docker.listContainers({
        filters: { label: ['codeblocking.userId'] },
    });

    const activeIds = new Set(Array.from(activeContainers.values()).map(c => c.containerId));

    for (const containerInfo of containers) {
        // Skip if this container is currently active or pending
        if (activeIds.has(containerInfo.Id) || pendingContainerIds.has(containerInfo.Id)) {
            continue;
        }

        try {
            const container = docker.getContainer(containerInfo.Id);
            await container.stop({ t: 1 });
            await container.remove();
            console.log(`Cleaned up orphaned container: ${containerInfo.Id.substring(0, 12)}`);
        } catch (error) {
            console.error(`Error cleaning up orphaned container:`, error);
        }
    }
}

export function getContainerPorts(userId: string, projectId: string): Map<number, number> | null {
    const key = getContainerKey(userId, projectId);
    const info = activeContainers.get(key);
    return info?.ports || null;
}
