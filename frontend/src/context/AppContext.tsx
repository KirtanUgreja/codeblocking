'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { FileNode, OpenFile, WSMessage, TerminalSession } from '@/types';
import { ApiService } from '@/services/api';
import { websocketService } from '@/services/websocket';
import { v4 as uuidv4 } from 'uuid';

interface AppContextType {
    fileTree: FileNode[];
    openFiles: Map<string, OpenFile>;
    activeFilePath: string | null;
    terminals: Map<string, TerminalSession>;
    activeTerminalId: string | null;
    executionOutput: string[];
    isExecuting: boolean;
    bottomPanelTab: 'terminal' | 'output';
    loadFileTree: () => Promise<void>;
    openFile: (path: string) => Promise<void>;
    closeFile: (path: string) => void;
    setActiveFile: (path: string) => void;
    updateFileContent: (path: string, content: string) => void;
    saveFile: (path: string) => Promise<void>;
    createNewFile: (path: string, content: string) => Promise<void>;
    deleteFile: (path: string) => Promise<void>;
    executeFile: (path: string) => Promise<void>;
    stopExecution: () => Promise<void>;
    setBottomPanelTab: (tab: 'terminal' | 'output') => void;
    createTerminal: () => void;
    closeTerminal: (id: string) => void;
    setActiveTerminal: (id: string) => void;
    sendTerminalInput: (terminalId: string, data: string) => void;
    clearTerminal: (terminalId: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
    const [fileTree, setFileTree] = useState<FileNode[]>([]);
    const [openFiles, setOpenFiles] = useState<Map<string, OpenFile>>(new Map());
    const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
    const [terminals, setTerminals] = useState<Map<string, TerminalSession>>(new Map());
    const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);
    const [executionOutput, setExecutionOutput] = useState<string[]>([]);
    const [isExecuting, setIsExecuting] = useState(false);
    const [bottomPanelTab, setBottomPanelTab] = useState<'terminal' | 'output'>('terminal');

    // Initialize WebSocket and create default terminal
    useEffect(() => {
        websocketService.connect();

        const unsubscribe = websocketService.onMessage((message: WSMessage) => {
            switch (message.type) {
                case 'terminal:output':
                    setTerminals((prev) => {
                        const newTerminals = new Map(prev);
                        const terminal = newTerminals.get(message.terminalId);
                        if (terminal) {
                            terminal.output = [...terminal.output, message.data];
                        }
                        return newTerminals;
                    });
                    break;
                case 'terminal:exit':
                    setTerminals((prev) => {
                        const newTerminals = new Map(prev);
                        const terminal = newTerminals.get(message.terminalId);
                        if (terminal) {
                            terminal.output = [...terminal.output, `\n[Process exited with code ${message.exitCode}]\n`];
                        }
                        return newTerminals;
                    });
                    break;
                case 'execution:stdout':
                    setExecutionOutput((prev) => [...prev, message.data]);
                    break;
                case 'execution:stderr':
                    setExecutionOutput((prev) => [...prev, `[ERROR] ${message.data}`]);
                    break;
                case 'execution:exit':
                    setExecutionOutput((prev) => [...prev, `\n[Execution completed with exit code ${message.exitCode}]\n`]);
                    setIsExecuting(false);
                    break;
            }
        });

        // Create default terminal
        const defaultTerminalId = uuidv4();
        setTerminals(new Map([[defaultTerminalId, { id: defaultTerminalId, output: [] }]]));
        setActiveTerminalId(defaultTerminalId);
        websocketService.send({ type: 'terminal:create', terminalId: defaultTerminalId });

        return () => {
            unsubscribe();
            websocketService.disconnect();
        };
    }, []);

    const loadFileTree = async () => {
        try {
            const tree = await ApiService.getFileTree();
            setFileTree(tree);
        } catch (error) {
            console.error('Failed to load file tree:', error);
        }
    };

    const openFile = async (path: string) => {
        if (openFiles.has(path)) {
            setActiveFilePath(path);
            return;
        }

        try {
            const fileContent = await ApiService.readFile(path);
            const newFile: OpenFile = {
                path: fileContent.path,
                content: fileContent.content,
                isDirty: false,
            };

            setOpenFiles((prev) => new Map(prev).set(path, newFile));
            setActiveFilePath(path);
        } catch (error) {
            console.error('Failed to open file:', error);
        }
    };

    const closeFile = (path: string) => {
        const newOpenFiles = new Map(openFiles);
        newOpenFiles.delete(path);
        setOpenFiles(newOpenFiles);

        if (activeFilePath === path) {
            const remainingFiles = Array.from(newOpenFiles.keys());
            setActiveFilePath(remainingFiles.length > 0 ? remainingFiles[0] : null);
        }
    };

    const setActiveFile = (path: string) => {
        setActiveFilePath(path);
    };

    const updateFileContent = (path: string, content: string) => {
        const file = openFiles.get(path);
        if (file) {
            const updatedFile = { ...file, content, isDirty: true };
            setOpenFiles((prev) => new Map(prev).set(path, updatedFile));
        }
    };

    const saveFile = async (path: string) => {
        const file = openFiles.get(path);
        if (!file) return;

        try {
            await ApiService.writeFile(path, file.content);
            const updatedFile = { ...file, isDirty: false };
            setOpenFiles((prev) => new Map(prev).set(path, updatedFile));
        } catch (error) {
            console.error('Failed to save file:', error);
        }
    };

    const executeFile = async (path: string) => {
        if (!activeTerminalId) {
            // Ensure terminal exists
            createTerminal();
            // Give it a moment to initialize
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        const terminalId = activeTerminalId || Array.from(terminals.keys())[0];
        if (!terminalId) return;

        setIsExecuting(true);
        setBottomPanelTab('terminal');

        // Determine command based on file extension
        const ext = path.split('.').pop()?.toLowerCase();
        let command = '';

        switch (ext) {
            case 'js':
                command = `node "${path}"\n`;
                break;
            case 'ts':
                command = `npx tsx "${path}"\n`;
                break;
            case 'py':
                // -u for unbuffered output to see prints immediately
                command = `python3 -u "${path}"\n`;
                break;
            case 'sh':
                command = `bash "${path}"\n`;
                break;
            default:
                command = `echo "Unsupported file type: .${ext}"\n`;
        }

        sendTerminalInput(terminalId, command);

        // Reset execution state after a delay (since we don't know exactly when terminal command finishes)
        setTimeout(() => setIsExecuting(false), 1000);
    };

    const stopExecution = async () => {
        try {
            await ApiService.stopExecution();
            setIsExecuting(false);
        } catch (error) {
            console.error('Failed to stop execution:', error);
        }
    };

    const createNewFile = async (path: string, content: string) => {
        try {
            await ApiService.writeFile(path, content);
        } catch (error) {
            console.error('Failed to create file:', error);
            throw error;
        }
    };

    const deleteFile = async (path: string) => {
        try {
            await ApiService.deleteFile(path);

            // Close the file tab if it's open
            if (openFiles.has(path)) {
                closeFile(path);
            }

            // Refresh file tree
            await loadFileTree();
        } catch (error) {
            console.error('Failed to delete file:', error);
            throw error;
        }
    };

    const createTerminal = () => {
        const newTerminalId = uuidv4();
        setTerminals((prev) => new Map(prev).set(newTerminalId, { id: newTerminalId, output: [] }));
        setActiveTerminalId(newTerminalId);
        websocketService.send({ type: 'terminal:create', terminalId: newTerminalId });
    };

    const closeTerminal = (id: string) => {
        websocketService.send({ type: 'terminal:close', terminalId: id });
        setTerminals((prev) => {
            const newTerminals = new Map(prev);
            newTerminals.delete(id);
            return newTerminals;
        });

        if (activeTerminalId === id) {
            const remainingTerminals = Array.from(terminals.keys()).filter((tId) => tId !== id);
            setActiveTerminalId(remainingTerminals.length > 0 ? remainingTerminals[0] : null);
        }
    };

    const setActiveTerminal = (id: string) => {
        setActiveTerminalId(id);
    };

    const sendTerminalInput = (terminalId: string, data: string) => {
        websocketService.send({ type: 'terminal:input', terminalId, data });
    };

    const clearTerminal = (terminalId: string) => {
        setTerminals((prev) => {
            const newTerminals = new Map(prev);
            const terminal = newTerminals.get(terminalId);
            if (terminal) {
                terminal.output = [];
            }
            return newTerminals;
        });
    };

    const value: AppContextType = {
        fileTree,
        openFiles,
        activeFilePath,
        terminals,
        activeTerminalId,
        executionOutput,
        isExecuting,
        bottomPanelTab,
        loadFileTree,
        openFile,
        closeFile,
        setActiveFile,
        updateFileContent,
        saveFile,
        createNewFile,
        deleteFile,
        executeFile,
        stopExecution,
        setBottomPanelTab,
        createTerminal,
        closeTerminal,
        setActiveTerminal,
        sendTerminalInput,
        clearTerminal,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within AppProvider');
    }
    return context;
}
