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

    // Fallback to standard Docker socket
    return '/var/run/docker.sock';
}

const docker = new Docker({ socketPath: getDockerSocket() });

// Environment to Docker image mapping
// Using custom codeblocking images (with fallbacks to public images if not built)
const ENVIRONMENT_IMAGES: Record<string, string> = {
    python: 'codeblocking/python',
    node: 'codeblocking/node',
    java: 'codeblocking/java',
    base: 'codeblocking/base',
};

// Port range for container bindings (3000-3010 for each user session)
const PORT_RANGE_START = 3100;
const PORT_RANGE_SIZE = 10;

interface ContainerInfo {
    containerId: string;
    environment: string;
    ports: Map<number, number>; // container port -> host port
    projectPath: string;
}

// Track active containers: userId-projectId -> ContainerInfo
const activeContainers: Map<string, ContainerInfo> = new Map();

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

    const imageName = ENVIRONMENT_IMAGES[environment] || ENVIRONMENT_IMAGES.base;

    // Find available ports for common dev server ports
    const portBindings: Record<string, { HostPort: string }[]> = {};
    const ports = new Map<number, number>();

    // Bind ports 3000-3010 from container to available host ports
    for (let containerPort = 3000; containerPort <= 3010; containerPort++) {
        const hostPort = await findAvailablePort();
        portBindings[`${containerPort}/tcp`] = [{ HostPort: hostPort.toString() }];
        ports.set(containerPort, hostPort);
    }

    // Ensure project directory exists and get absolute path
    const absoluteProjectPath = path.resolve(projectPath);

    try {
        // Create container
        const container = await docker.createContainer({
            Image: imageName,
            Cmd: ['/bin/bash'],
            Tty: true,
            OpenStdin: true,
            WorkingDir: '/workspace',
            HostConfig: {
                Binds: [`${absoluteProjectPath}:/workspace:rw`],
                PortBindings: portBindings,
                // Resource limits
                Memory: 512 * 1024 * 1024, // 512MB
                CpuShares: 256, // 25% of CPU
            },
            Labels: {
                'codeblocking.userId': userId,
                'codeblocking.projectId': projectId,
            },
        });

        await container.start();

        const info: ContainerInfo = {
            containerId: container.id,
            environment,
            ports,
            projectPath: absoluteProjectPath,
        };

        activeContainers.set(key, info);
        console.log(`Container started for ${key}: ${container.id.substring(0, 12)}`);

        return info;
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

    for (const containerInfo of containers) {
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
