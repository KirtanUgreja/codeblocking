import Docker from 'dockerode';
interface ContainerInfo {
    containerId: string;
    environment: string;
    ports: Map<number, number>;
    projectPath: string;
}
export declare function getContainer(userId: string, projectId: string): Promise<ContainerInfo | null>;
export declare function spawnContainer(userId: string, projectId: string, environment: string, projectPath: string): Promise<ContainerInfo>;
export declare function execInContainer(userId: string, projectId: string): Promise<Docker.Exec | null>;
export declare function stopContainer(userId: string, projectId: string): Promise<void>;
export declare function cleanupAllContainers(): Promise<void>;
export declare function getContainerPorts(userId: string, projectId: string): Map<number, number> | null;
export {};
