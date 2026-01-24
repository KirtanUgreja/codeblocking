// File system types
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

// Editor types
export interface OpenFile {
    path: string;
    content: string;
    isDirty: boolean;
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

export interface ExecutionOutput {
    type: 'stdout' | 'stderr' | 'exit';
    data: string;
    exitCode?: number;
}

// Terminal session types
export interface TerminalSession {
    id: string;
    output: string[];
}

// WebSocket message types
export type WSMessage =
    | { type: 'terminal:output'; terminalId: string; data: string }
    | { type: 'terminal:exit'; terminalId: string; exitCode: number }
    | { type: 'execution:stdout'; data: string }
    | { type: 'execution:stderr'; data: string }
    | { type: 'execution:exit'; data: string; exitCode: number };

// App state types
export interface AppState {
    fileTree: FileNode[];
    openFiles: Map<string, OpenFile>;
    activeFilePath: string | null;
    terminals: Map<string, TerminalSession>;
    activeTerminalId: string | null;
    executionOutput: string[];
    isExecuting: boolean;
    bottomPanelTab: 'terminal' | 'output';
}
