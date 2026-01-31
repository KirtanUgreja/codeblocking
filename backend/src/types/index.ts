// Type definitions for the IDE backend

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

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface TerminalSession {
    id: string;
    createdAt: Date;
}
