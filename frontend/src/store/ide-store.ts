import { create } from 'zustand';
import { api, FileNode } from '@/lib/api';

interface IdeState {
    // File System
    fileTree: FileNode[];
    isLoadingFiles: boolean;
    setFileTree: (tree: FileNode[]) => void;
    fetchFileTree: () => Promise<void>;

    // Editor State
    openFiles: string[]; // array of file paths/ids
    activeFile: string | null;
    activeFileContent: string;
    activeFileLanguage: string;
    unsavedFiles: Set<string>;
    openFile: (fileId: string) => void;
    closeFile: (fileId: string) => void;
    setActiveFile: (fileId: string) => void;
    setActiveFileContent: (content: string) => void;
    markUnsaved: (fileId: string, unsaved: boolean) => void;
    saveActiveFile: () => Promise<void>;
    fetchFileContent: (filePath: string) => Promise<void>;

    // Terminal State
    isTerminalOpen: boolean;
    toggleTerminal: () => void;

    // Layout State
    isSidebarOpen: boolean;
    toggleSidebar: () => void;

    // Backend connection status
    isBackendConnected: boolean;
    setBackendConnected: (connected: boolean) => void;
}

export const useIdeStore = create<IdeState>((set, get) => ({
    fileTree: [],
    isLoadingFiles: false,
    setFileTree: (tree) => set({ fileTree: tree }),

    fetchFileTree: async () => {
        set({ isLoadingFiles: true });
        try {
            const response = await api.getFileTree();
            if (response.success && response.data) {
                set({ fileTree: response.data, isBackendConnected: true });
            }
        } catch (error) {
            console.error('Failed to fetch file tree:', error);
            set({ isBackendConnected: false });
        } finally {
            set({ isLoadingFiles: false });
        }
    },

    openFiles: [],
    activeFile: null,
    activeFileContent: '',
    activeFileLanguage: 'plaintext',
    unsavedFiles: new Set(),

    openFile: (fileId) => set((state) => {
        if (!state.openFiles.includes(fileId)) {
            return {
                openFiles: [...state.openFiles, fileId],
                activeFile: fileId
            };
        }
        return { activeFile: fileId };
    }),

    closeFile: (fileId) => set((state) => {
        const newOpenFiles = state.openFiles.filter(id => id !== fileId);
        let newActiveFile = state.activeFile;

        if (state.activeFile === fileId) {
            newActiveFile = newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null;
        }

        return {
            openFiles: newOpenFiles,
            activeFile: newActiveFile
        };
    }),

    setActiveFile: (fileId) => set({ activeFile: fileId }),

    setActiveFileContent: (content) => set((state) => {
        if (state.activeFile) {
            const newUnsaved = new Set(state.unsavedFiles);
            newUnsaved.add(state.activeFile);
            return { activeFileContent: content, unsavedFiles: newUnsaved };
        }
        return { activeFileContent: content };
    }),

    fetchFileContent: async (filePath) => {
        try {
            const response = await api.readFile(filePath);
            if (response.success && response.data) {
                set({
                    activeFileContent: response.data.content,
                    activeFileLanguage: response.data.language
                });
            }
        } catch (error) {
            console.error('Failed to fetch file content:', error);
        }
    },

    saveActiveFile: async () => {
        const state = get();
        if (!state.activeFile) return;

        try {
            const response = await api.writeFile(state.activeFile, state.activeFileContent);
            if (response.success) {
                const newUnsaved = new Set(state.unsavedFiles);
                newUnsaved.delete(state.activeFile);
                set({ unsavedFiles: newUnsaved });
            }
        } catch (error) {
            console.error('Failed to save file:', error);
        }
    },

    markUnsaved: (fileId, unsaved) => set((state) => {
        const newUnsaved = new Set(state.unsavedFiles);
        if (unsaved) {
            newUnsaved.add(fileId);
        } else {
            newUnsaved.delete(fileId);
        }
        return { unsavedFiles: newUnsaved };
    }),

    isTerminalOpen: true,
    toggleTerminal: () => set((state) => ({ isTerminalOpen: !state.isTerminalOpen })),

    isSidebarOpen: true,
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

    isBackendConnected: false,
    setBackendConnected: (connected) => set({ isBackendConnected: connected }),
}));

// Re-export FileNode for convenience
export type { FileNode };
