"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContainer = getContainer;
exports.spawnContainer = spawnContainer;
exports.execInContainer = execInContainer;
exports.stopContainer = stopContainer;
exports.cleanupAllContainers = cleanupAllContainers;
exports.getContainerPorts = getContainerPorts;
// Docker container service for managing IDE environments
const dockerode_1 = __importDefault(require("dockerode"));
const path_1 = __importDefault(require("path"));
const docker = new dockerode_1.default();
// Environment to Docker image mapping
const ENVIRONMENT_IMAGES = {
    python: 'codeblocking/python',
    node: 'codeblocking/node',
    java: 'codeblocking/java',
    base: 'codeblocking/base',
};
// Port range for container bindings (3000-3010 for each user session)
const PORT_RANGE_START = 3100;
const PORT_RANGE_SIZE = 10;
// Track active containers: userId-projectId -> ContainerInfo
const activeContainers = new Map();
// Track used host ports
const usedPorts = new Set();
function getContainerKey(userId, projectId) {
    return `${userId}-${projectId}`;
}
function findAvailablePort() {
    for (let port = PORT_RANGE_START; port < PORT_RANGE_START + 1000; port++) {
        if (!usedPorts.has(port)) {
            usedPorts.add(port);
            return port;
        }
    }
    throw new Error('No available ports');
}
function releasePort(port) {
    usedPorts.delete(port);
}
async function getContainer(userId, projectId) {
    const key = getContainerKey(userId, projectId);
    const info = activeContainers.get(key);
    if (!info)
        return null;
    // Verify container is still running
    try {
        const container = docker.getContainer(info.containerId);
        const data = await container.inspect();
        if (data.State.Running) {
            return info;
        }
    }
    catch (error) {
        // Container no longer exists
        activeContainers.delete(key);
    }
    return null;
}
async function spawnContainer(userId, projectId, environment, projectPath) {
    const key = getContainerKey(userId, projectId);
    // Check if container already exists
    const existing = await getContainer(userId, projectId);
    if (existing) {
        return existing;
    }
    const imageName = ENVIRONMENT_IMAGES[environment] || ENVIRONMENT_IMAGES.base;
    // Find available ports for common dev server ports
    const portBindings = {};
    const ports = new Map();
    // Bind ports 3000-3010 from container to available host ports
    for (let containerPort = 3000; containerPort <= 3010; containerPort++) {
        const hostPort = findAvailablePort();
        portBindings[`${containerPort}/tcp`] = [{ HostPort: hostPort.toString() }];
        ports.set(containerPort, hostPort);
    }
    // Ensure project directory exists and get absolute path
    const absoluteProjectPath = path_1.default.resolve(projectPath);
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
        const info = {
            containerId: container.id,
            environment,
            ports,
            projectPath: absoluteProjectPath,
        };
        activeContainers.set(key, info);
        console.log(`Container started for ${key}: ${container.id.substring(0, 12)}`);
        return info;
    }
    catch (error) {
        // Release ports if container creation failed
        ports.forEach((hostPort) => releasePort(hostPort));
        throw error;
    }
}
async function execInContainer(userId, projectId) {
    const info = await getContainer(userId, projectId);
    if (!info)
        return null;
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
async function stopContainer(userId, projectId) {
    const key = getContainerKey(userId, projectId);
    const info = activeContainers.get(key);
    if (!info)
        return;
    try {
        const container = docker.getContainer(info.containerId);
        await container.stop({ t: 5 });
        await container.remove();
        console.log(`Container stopped for ${key}`);
    }
    catch (error) {
        console.error(`Error stopping container ${key}:`, error);
    }
    // Release ports
    info.ports.forEach((hostPort) => releasePort(hostPort));
    activeContainers.delete(key);
}
async function cleanupAllContainers() {
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
        }
        catch (error) {
            console.error(`Error cleaning up orphaned container:`, error);
        }
    }
}
function getContainerPorts(userId, projectId) {
    const key = getContainerKey(userId, projectId);
    const info = activeContainers.get(key);
    return info?.ports || null;
}
