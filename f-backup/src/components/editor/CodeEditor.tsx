"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";
import { useIdeStore } from "@/store/ide-store";
import { X, Circle, Save, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Detect if user is on Mac
const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const modKey = isMac ? '⌘' : 'Ctrl';

const TabBar = () => {
    const { openFiles, activeFile, setActiveFile, closeFile, unsavedFiles, fetchFileContent } = useIdeStore();

    if (openFiles.length === 0) return null;

    const handleTabClick = async (fileId: string) => {
        setActiveFile(fileId);
        await fetchFileContent(fileId);
    };

    const getFileName = (path: string) => {
        const parts = path.split('/');
        return parts[parts.length - 1];
    };

    return (
        <div className="flex bg-secondary/20 border-b border-border overflow-x-auto hide-scrollbar">
            {openFiles.map((fileId) => (
                <div
                    key={fileId}
                    onClick={() => handleTabClick(fileId)}
                    className={cn(
                        "group flex items-center min-w-[120px] max-w-[200px] h-9 px-3 border-r border-border/50 text-xs cursor-pointer select-none hover:bg-secondary/30 transition-colors",
                        activeFile === fileId && "bg-background border-t-2 border-t-primary text-foreground"
                    )}
                >
                    <div className="flex items-center gap-2 flex-1 overflow-hidden">
                        <span className={cn(
                            "w-3 h-3 shrink-0",
                            fileId.endsWith('ts') || fileId.endsWith('tsx') ? 'text-blue-400' :
                                fileId.endsWith('css') ? 'text-blue-300' : 'text-gray-400'
                        )}>
                            #
                        </span>
                        <span className="truncate">{getFileName(fileId)}</span>
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            closeFile(fileId);
                        }}
                        className={cn(
                            "ml-2 p-0.5 rounded-sm opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/20 transition-all",
                            unsavedFiles.has(fileId) && "opacity-100"
                        )}
                    >
                        {unsavedFiles.has(fileId) ? (
                            <Circle className="w-2 h-2 fill-current text-foreground" />
                        ) : (
                            <X className="w-3 h-3" />
                        )}
                    </button>
                </div>
            ))}
        </div>
    );
};

export default function CodeEditor() {
    const {
        activeFile,
        activeFileContent,
        activeFileLanguage,
        setActiveFileContent,
        saveActiveFile,
        unsavedFiles
    } = useIdeStore();

    const monaco = useMonaco();
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showSaved, setShowSaved] = useState(false);

    useEffect(() => {
        if (monaco) {
            monaco.editor.defineTheme("vst-dark", {
                base: "vs-dark",
                inherit: true,
                rules: [],
                colors: {
                    "editor.background": "#0a0a0c",
                },
            });
            monaco.editor.setTheme("vst-dark");
        }
    }, [monaco]);

    // Save function - defined before use
    const performSave = useCallback(async () => {
        setIsSaving(true);
        await saveActiveFile();
        setIsSaving(false);
        setShowSaved(true);
        setTimeout(() => setShowSaved(false), 2000);
    }, [saveActiveFile]);

    // Handle keyboard shortcuts
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 's') {
            e.preventDefault();
            performSave();
        }
    }, [performSave]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Debounced autosave - saves 1.5 seconds after user stops typing
    const handleEditorChange = useCallback((value: string | undefined) => {
        if (value !== undefined) {
            setActiveFileContent(value);

            // Clear existing timer
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }

            // Set new autosave timer (1.5 seconds after typing stops)
            autoSaveTimerRef.current = setTimeout(async () => {
                setIsSaving(true);
                await saveActiveFile();
                setIsSaving(false);
                setShowSaved(true);
                setTimeout(() => setShowSaved(false), 2000);
            }, 1500);
        }
    }, [setActiveFileContent, saveActiveFile]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }
        };
    }, []);

    if (!activeFile) {
        return (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground/50 text-sm">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-secondary/30 flex items-center justify-center">
                        <span className="text-4xl">📝</span>
                    </div>
                    <p>Select a file or create one to start editing</p>
                </div>
            </div>
        );
    }

    const getLanguage = (filename: string) => {
        if (activeFileLanguage && activeFileLanguage !== 'plaintext') return activeFileLanguage;
        if (filename.endsWith(".tsx")) return "typescriptreact";
        if (filename.endsWith(".ts")) return "typescript";
        if (filename.endsWith(".jsx")) return "javascriptreact";
        if (filename.endsWith(".js")) return "javascript";
        if (filename.endsWith(".css")) return "css";
        if (filename.endsWith(".json")) return "json";
        if (filename.endsWith(".html")) return "html";
        if (filename.endsWith(".md")) return "markdown";
        if (filename.endsWith(".py")) return "python";
        return "plaintext";
    };

    return (
        <div className="h-full w-full flex flex-col bg-background min-w-0 min-h-0">
            <TabBar />

            {/* Save status indicator */}
            <div className="absolute top-12 right-4 z-10">
                {isSaving && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-secondary/80 rounded text-xs text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Saving...</span>
                    </div>
                )}
                {showSaved && !isSaving && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/20 rounded text-xs text-green-400">
                        <Check className="w-3 h-3" />
                        <span>Saved</span>
                    </div>
                )}
                {!isSaving && !showSaved && activeFile && unsavedFiles.has(activeFile) && (
                    <button
                        onClick={performSave}
                        className="flex items-center gap-1 px-2 py-1 bg-primary/20 hover:bg-primary/30 rounded text-xs text-primary transition-colors"
                    >
                        <Save className="w-3 h-3" />
                        <span>{modKey}+S to save</span>
                    </button>
                )}
            </div>

            <div className="flex-1 relative">
                <Editor
                    height="100%"
                    path={activeFile}
                    language={getLanguage(activeFile)}
                    value={activeFileContent}
                    theme="vst-dark"
                    onChange={handleEditorChange}
                    options={{
                        minimap: { enabled: true },
                        fontSize: 14,
                        lineHeight: 21,
                        padding: { top: 16 },
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        fontLigatures: true,
                        scrollBeyondLastLine: false,
                        smoothScrolling: true,
                        cursorBlinking: "smooth",
                        cursorSmoothCaretAnimation: "on",
                    }}
                />
            </div>
        </div>
    );
}
