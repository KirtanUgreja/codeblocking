export declare function getProjectPath(userId: string, projectId: string): string;
export declare function getProjectPath(projectId: string): string;
export declare function cloneRepository(repoUrl: string, githubToken: string, userId: string, projectId: string): Promise<string>;
export declare function pullRepository(projectPath: string): Promise<void>;
export declare function pushRepository(projectPath: string, message?: string): Promise<void>;
export declare function deleteProject(userId: string, projectId: string): void;
