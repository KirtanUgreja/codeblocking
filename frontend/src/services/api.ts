import { FileNode, FileContent, ExecutionRequest } from '@/types';

const API_BASE = 'http://127.0.0.1:3001/api';

export class ApiService {
    /**
     * Get workspace file tree
     */
    static async getFileTree(): Promise<FileNode[]> {
        const response = await fetch(`${API_BASE}/files`);
        if (!response.ok) {
            throw new Error('Failed to fetch file tree');
        }
        const data = await response.json();
        return data.data;
    }

    /**
     * Read file contents
     */
    static async readFile(filePath: string): Promise<FileContent> {
        const response = await fetch(`${API_BASE}/files/${filePath}`);
        if (!response.ok) {
            throw new Error('Failed to read file');
        }
        const data = await response.json();
        return data.data;
    }

    /**
     * Write file contents
     */
    static async writeFile(path: string, content: string): Promise<void> {
        const response = await fetch(`${API_BASE}/files/${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content }),
        });
        if (!response.ok) {
            throw new Error('Failed to write file');
        }
    }

    /**
     * Delete file or directory
     */
    static async deleteFile(path: string): Promise<void> {
        const response = await fetch(`${API_BASE}/files/${path}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new Error('Failed to delete file');
        }
    }

    /**
     * Execute a file
     */
    static async execute(request: ExecutionRequest): Promise<void> {
        const response = await fetch(`${API_BASE}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
        });
        if (!response.ok) {
            throw new Error('Failed to execute file');
        }
    }

    /**
     * Stop current execution
     */
    static async stopExecution(): Promise<void> {
        const response = await fetch(`${API_BASE}/execute/stop`, {
            method: 'POST',
        });
        if (!response.ok) {
            throw new Error('Failed to stop execution');
        }
    }
}
