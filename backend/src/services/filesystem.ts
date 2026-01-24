import fs from 'fs/promises';
import path from 'path';
import { workspaceService } from './workspace';
import { FileNode, FileContent } from '../types';
import { AppError } from '../middleware/error';

export class FilesystemService {
    /**
     * Validates and resolves a path to ensure it's within the workspace
     */
    private validatePath(filePath: string): string {
        const workspacePath = workspaceService.getWorkspacePath();
        const resolvedPath = path.resolve(workspacePath, filePath);

        // Prevent directory traversal attacks
        if (!resolvedPath.startsWith(workspacePath)) {
            throw new AppError(403, 'Access denied: Path outside workspace');
        }

        return resolvedPath;
    }

    /**
     * Recursively build file tree structure
     */
    async getFileTree(dirPath: string = ''): Promise<FileNode[]> {
        const fullPath = this.validatePath(dirPath);

        try {
            const entries = await fs.readdir(fullPath, { withFileTypes: true });
            const nodes: FileNode[] = [];

            for (const entry of entries) {
                const relativePath = path.join(dirPath, entry.name);
                const node: FileNode = {
                    name: entry.name,
                    path: relativePath,
                    isDirectory: entry.isDirectory(),
                };

                if (entry.isDirectory()) {
                    node.children = await this.getFileTree(relativePath);
                }

                nodes.push(node);
            }

            return nodes.sort((a, b) => {
                // Directories first, then alphabetical
                if (a.isDirectory && !b.isDirectory) return -1;
                if (!a.isDirectory && b.isDirectory) return 1;
                return a.name.localeCompare(b.name);
            });
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                throw new AppError(404, 'Directory not found');
            }
            throw error;
        }
    }

    /**
     * Read file contents
     */
    async readFile(filePath: string): Promise<FileContent> {
        const fullPath = this.validatePath(filePath);

        try {
            const content = await fs.readFile(fullPath, 'utf-8');
            return { path: filePath, content };
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                throw new AppError(404, 'File not found');
            }
            if ((error as NodeJS.ErrnoException).code === 'EISDIR') {
                throw new AppError(400, 'Path is a directory');
            }
            throw error;
        }
    }

    /**
     * Write file contents (creates file if doesn't exist)
     */
    async writeFile(filePath: string, content: string): Promise<void> {
        const fullPath = this.validatePath(filePath);

        try {
            // Ensure parent directory exists
            const dir = path.dirname(fullPath);
            await fs.mkdir(dir, { recursive: true });

            await fs.writeFile(fullPath, content, 'utf-8');
        } catch (error) {
            throw new AppError(500, 'Failed to write file');
        }
    }

    /**
     * Create a new directory
     */
    async createDirectory(dirPath: string): Promise<void> {
        const fullPath = this.validatePath(dirPath);

        try {
            await fs.mkdir(fullPath, { recursive: true });
        } catch (error) {
            throw new AppError(500, 'Failed to create directory');
        }
    }

    /**
     * Delete file or directory
     */
    async delete(filePath: string): Promise<void> {
        const fullPath = this.validatePath(filePath);

        try {
            const stat = await fs.stat(fullPath);

            if (stat.isDirectory()) {
                await fs.rm(fullPath, { recursive: true, force: true });
            } else {
                await fs.unlink(fullPath);
            }
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                throw new AppError(404, 'File or directory not found');
            }
            throw new AppError(500, 'Failed to delete');
        }
    }

    /**
     * Check if path exists
     */
    async exists(filePath: string): Promise<boolean> {
        const fullPath = this.validatePath(filePath);

        try {
            await fs.access(fullPath);
            return true;
        } catch {
            return false;
        }
    }
}

export const filesystemService = new FilesystemService();
