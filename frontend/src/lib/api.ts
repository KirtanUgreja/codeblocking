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
    private authToken: string | null = null;

    constructor(baseUrl: string = API_BASE) {
        this.baseUrl = baseUrl;
    }

    setAuthToken(token: string | null): void {
        this.authToken = token;
    }

    private async fetch<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                ...options?.headers as Record<string, string>,
            };

            if (this.authToken) {
                headers['Authorization'] = `Bearer ${this.authToken}`;
            }

            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                headers,
            });
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            return { success: false, error: 'Network error' };
        }
    }

    // File System API (project-specific)

    async getFileTree(projectId: string): Promise<ApiResponse<FileNode[]>> {
        return this.fetch<FileNode[]>(`/api/files/tree/${projectId}`);
    }

    async readFile(projectId: string, path: string): Promise<ApiResponse<FileContent>> {
        return this.fetch<FileContent>(`/api/files/${projectId}/read?path=${encodeURIComponent(path)}`);
    }

    async writeFile(projectId: string, path: string, content: string): Promise<ApiResponse<void>> {
        return this.fetch<void>(`/api/files/${projectId}/write`, {
            method: 'POST',
            body: JSON.stringify({ path, content }),
        });
    }

    async createFile(projectId: string, path: string): Promise<ApiResponse<void>> {
        return this.fetch<void>(`/api/files/${projectId}/create`, {
            method: 'POST',
            body: JSON.stringify({ path, type: 'file' }),
        });
    }

    async createFolder(projectId: string, path: string): Promise<ApiResponse<void>> {
        return this.fetch<void>(`/api/files/${projectId}/create`, {
            method: 'POST',
            body: JSON.stringify({ path, type: 'folder' }),
        });
    }

    async deleteItem(projectId: string, path: string): Promise<ApiResponse<void>> {
        return this.fetch<void>(`/api/files/${projectId}/delete?path=${encodeURIComponent(path)}`, {
            method: 'DELETE',
        });
    }

    // Health check
    async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string; terminals: number }>> {
        return this.fetch('/api/health');
    }
}

export const api = new ApiClient();
export type { FileNode, FileContent, ApiResponse };
