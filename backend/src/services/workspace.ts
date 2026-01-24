import fs from 'fs/promises';
import path from 'path';
import { config } from '../config';

export class WorkspaceService {
    private initialized = false;

    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        try {
            // Ensure workspace directory exists
            await fs.mkdir(config.workspaceDir, { recursive: true });

            // Verify it's accessible
            await fs.access(config.workspaceDir, fs.constants.R_OK | fs.constants.W_OK);

            this.initialized = true;
            console.log(`Workspace initialized at: ${path.resolve(config.workspaceDir)}`);
        } catch (error) {
            console.error('Failed to initialize workspace:', error);
            throw new Error('Workspace initialization failed');
        }
    }

    isInitialized(): boolean {
        return this.initialized;
    }

    getWorkspacePath(): string {
        return path.resolve(config.workspaceDir);
    }
}

export const workspaceService = new WorkspaceService();
