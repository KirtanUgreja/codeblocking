// API client for communicating with the backend

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

interface FileNode {
    id: string;
    name: string;
    type: 'file' | 'folder';
    path: string;
    children?: FileNode[];
}

interface FileContent {
    path: string;
    content: string;
    language: string;
}

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string = API_BASE) {
        this.baseUrl = baseUrl;
    }

    private async fetch<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options?.headers,
                },
            });
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            return { success: false, error: 'Network error' };
        }
    }

    // File System API

    async getFileTree(): Promise<ApiResponse<FileNode[]>> {
        return this.fetch<FileNode[]>('/api/files/tree');
    }

    async readFile(path: string): Promise<ApiResponse<FileContent>> {
        return this.fetch<FileContent>(`/api/files/read?path=${encodeURIComponent(path)}`);
    }

    async writeFile(path: string, content: string): Promise<ApiResponse<void>> {
        return this.fetch<void>('/api/files/write', {
            method: 'POST',
            body: JSON.stringify({ path, content }),
        });
    }

    async createFile(path: string): Promise<ApiResponse<void>> {
        return this.fetch<void>('/api/files/create', {
            method: 'POST',
            body: JSON.stringify({ path, type: 'file' }),
        });
    }

    async createFolder(path: string): Promise<ApiResponse<void>> {
        return this.fetch<void>('/api/files/create', {
            method: 'POST',
            body: JSON.stringify({ path, type: 'folder' }),
        });
    }

    async deleteItem(path: string): Promise<ApiResponse<void>> {
        return this.fetch<void>(`/api/files/delete?path=${encodeURIComponent(path)}`, {
            method: 'DELETE',
        });
    }

    async renameItem(oldPath: string, newPath: string): Promise<ApiResponse<void>> {
        return this.fetch<void>('/api/files/rename', {
            method: 'POST',
            body: JSON.stringify({ oldPath, newPath }),
        });
    }

    // Health check
    async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string; terminals: number }>> {
        return this.fetch('/api/health');
    }
}

export const api = new ApiClient();
export type { FileNode, FileContent, ApiResponse };
