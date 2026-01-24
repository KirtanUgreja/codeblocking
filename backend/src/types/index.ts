// File system types
export interface WebSocketMessage {
    type: string;
    terminalId?: string;
    data?: string;
    exitCode?: number;
    cols?: number;
    rows?: number;
}

export interface FileNode {
    name: string;
    path: string;
    isDirectory: boolean;
    children?: FileNode[];
}

export interface FileContent {
    path: string;
    content: string;
}

// Terminal types
export interface TerminalMessage {
    type: 'output' | 'error' | 'exit';
    data: string;
    exitCode?: number;
}

// Execution types
export interface ExecutionRequest {
    filePath: string;
    command?: string;
}

export interface ExecutionResponse {
    success: boolean;
    message: string;
    processId?: string;
}

export interface ExecutionOutput {
    type: 'stdout' | 'stderr' | 'exit';
    data: string;
    exitCode?: number;
}
