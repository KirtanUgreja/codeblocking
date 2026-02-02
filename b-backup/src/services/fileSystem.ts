// File System Service - Handles file operations for the IDE

import fs from 'fs/promises';
import path from 'path';
import { Dirent } from 'fs';

export interface FileNode {
    id: string;
    name: string;
    type: 'file' | 'folder';
    path: string;
    children?: FileNode[];
}

export interface FileContent {
    path: string;
    content: string;
    language: string;
}

class FileSystemService {
    private workspaceRoot: string;

    constructor(workspaceRoot?: string) {
        // Use a sandboxed workspace directory
        this.workspaceRoot = workspaceRoot || path.join(process.cwd(), 'workspace');
    }

    /**
     * Ensure the workspace directory exists
     */
    async ensureWorkspace(): Promise<void> {
        try {
            await fs.access(this.workspaceRoot);
        } catch {
            await fs.mkdir(this.workspaceRoot, { recursive: true });
            // Create a sample project structure
            await this.createSampleProject();
        }
    }

    /**
     * Create a sample project for demonstration
     */
    private async createSampleProject(): Promise<void> {
        const sampleFiles = [
            { path: 'src/index.ts', content: '// Welcome to CodeBlocking IDE!\nconsole.log("Hello, World!");\n' },
            { path: 'src/utils.ts', content: '// Utility functions\nexport const add = (a: number, b: number) => a + b;\n' },
            { path: 'package.json', content: JSON.stringify({ name: 'my-project', version: '1.0.0', main: 'src/index.ts' }, null, 2) },
            { path: 'README.md', content: '# My Project\n\nWelcome to your new project!\n' },
        ];

        for (const file of sampleFiles) {
            const filePath = path.join(this.workspaceRoot, file.path);
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            await fs.writeFile(filePath, file.content, 'utf-8');
        }
    }

    /**
     * Get the full file tree of the workspace
     */
    async getFileTree(dirPath: string = ''): Promise<FileNode[]> {
        const fullPath = path.join(this.workspaceRoot, dirPath);

        try {
            const entries = await fs.readdir(fullPath, { withFileTypes: true });
            const nodes: FileNode[] = [];

            for (const entry of entries) {
                // Skip hidden files and node_modules
                if (entry.name.startsWith('.') || entry.name === 'node_modules') {
                    continue;
                }

                const relativePath = path.join(dirPath, entry.name);
                const node: FileNode = {
                    id: relativePath,
                    name: entry.name,
                    type: entry.isDirectory() ? 'folder' : 'file',
                    path: relativePath,
                };

                if (entry.isDirectory()) {
                    node.children = await this.getFileTree(relativePath);
                }

                nodes.push(node);
            }

            // Sort: folders first, then alphabetically
            return nodes.sort((a, b) => {
                if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
                return a.name.localeCompare(b.name);
            });
        } catch (error) {
            console.error('Error reading directory:', error);
            return [];
        }
    }

    /**
     * Read file content
     */
    async readFile(filePath: string): Promise<FileContent> {
        const fullPath = path.join(this.workspaceRoot, filePath);

        // Security: Prevent path traversal
        if (!fullPath.startsWith(this.workspaceRoot)) {
            throw new Error('Access denied: Path traversal detected');
        }

        const content = await fs.readFile(fullPath, 'utf-8');
        const language = this.getLanguageFromPath(filePath);

        return {
            path: filePath,
            content,
            language,
        };
    }

    /**
     * Write file content
     */
    async writeFile(filePath: string, content: string): Promise<void> {
        const fullPath = path.join(this.workspaceRoot, filePath);

        // Security: Prevent path traversal
        if (!fullPath.startsWith(this.workspaceRoot)) {
            throw new Error('Access denied: Path traversal detected');
        }

        // Ensure parent directory exists
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content, 'utf-8');
    }

    /**
     * Create a new file
     */
    async createFile(filePath: string): Promise<void> {
        await this.writeFile(filePath, '');
    }

    /**
     * Create a new folder
     */
    async createFolder(folderPath: string): Promise<void> {
        const fullPath = path.join(this.workspaceRoot, folderPath);

        if (!fullPath.startsWith(this.workspaceRoot)) {
            throw new Error('Access denied: Path traversal detected');
        }

        await fs.mkdir(fullPath, { recursive: true });
    }

    /**
     * Delete a file or folder
     */
    async delete(itemPath: string): Promise<void> {
        const fullPath = path.join(this.workspaceRoot, itemPath);

        if (!fullPath.startsWith(this.workspaceRoot)) {
            throw new Error('Access denied: Path traversal detected');
        }

        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
            await fs.rm(fullPath, { recursive: true });
        } else {
            await fs.unlink(fullPath);
        }
    }

    /**
     * Rename a file or folder
     */
    async rename(oldPath: string, newPath: string): Promise<void> {
        const fullOldPath = path.join(this.workspaceRoot, oldPath);
        const fullNewPath = path.join(this.workspaceRoot, newPath);

        if (!fullOldPath.startsWith(this.workspaceRoot) || !fullNewPath.startsWith(this.workspaceRoot)) {
            throw new Error('Access denied: Path traversal detected');
        }

        await fs.rename(fullOldPath, fullNewPath);
    }

    /**
     * Get language identifier from file path
     */
    private getLanguageFromPath(filePath: string): string {
        const ext = path.extname(filePath).toLowerCase();
        const languageMap: Record<string, string> = {
            '.ts': 'typescript',
            '.tsx': 'typescriptreact',
            '.js': 'javascript',
            '.jsx': 'javascriptreact',
            '.json': 'json',
            '.css': 'css',
            '.scss': 'scss',
            '.html': 'html',
            '.md': 'markdown',
            '.py': 'python',
            '.go': 'go',
            '.rs': 'rust',
            '.java': 'java',
            '.c': 'c',
            '.cpp': 'cpp',
            '.h': 'c',
            '.hpp': 'cpp',
        };
        return languageMap[ext] || 'plaintext';
    }
}

export const fileSystemService = new FileSystemService();
