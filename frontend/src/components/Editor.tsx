'use client';

import { Editor as MonacoEditor } from '@monaco-editor/react';
import { useApp } from '@/context/AppContext';
import type { editor } from 'monaco-editor';

export default function Editor() {
    const { openFiles, activeFilePath, updateFileContent, saveFile } = useApp();
    const activeFile = activeFilePath ? openFiles.get(activeFilePath) : null;

    const handleEditorChange = (value: string | undefined) => {
        if (activeFilePath && value !== undefined) {
            updateFileContent(activeFilePath, value);
        }
    };

    const handleEditorMount = (monacoEditor: editor.IStandaloneCodeEditor, monaco: typeof import('monaco-editor')) => {
        // Define Neo Dark theme
        monaco.editor.defineTheme('neo-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [],
            colors: {
                'editor.background': '#0f0c24',
                'editor.foreground': '#e6e6f0',
                'editor.lineHighlightBackground': '#18143a',
                'editorCursor.foreground': '#7c5cff',
                'editor.selectionBackground': '#2d2b55',
                'editorLineNumber.foreground': '#55537a',
                'editorLineNumber.activeForeground': '#a48bff',
            }
        });
        monaco.editor.setTheme('neo-dark');

        // Add Ctrl+S shortcut for save
        monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            if (activeFilePath) {
                saveFile(activeFilePath);
            }
        });
    };

    if (!activeFile) {
        return (
            <div className="editor-area">
                <div className="editor-empty" style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                    color: 'var(--text-muted)'
                }}>
                    No file open
                </div>
            </div>
        );
    }

    // Detect language from file extension
    const getLanguage = (filePath: string): string => {
        const ext = filePath.split('.').pop()?.toLowerCase();
        const languageMap: Record<string, string> = {
            js: 'javascript',
            jsx: 'javascript',
            ts: 'typescript',
            tsx: 'typescript',
            py: 'python',
            json: 'json',
            html: 'html',
            css: 'css',
            md: 'markdown',
            sh: 'shell',
        };
        return languageMap[ext || ''] || 'plaintext';
    };

    return (
        <div className="editor-wrapper" style={{ flex: 1, overflow: 'hidden' }}>
            <MonacoEditor
                height="100%"
                language={getLanguage(activeFile.path)}
                value={activeFile.content}
                onChange={handleEditorChange}
                onMount={handleEditorMount}
                theme="neo-dark"
                options={{
                    fontSize: 14,
                    fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
                    minimap: { enabled: false },
                    wordWrap: 'off',
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    padding: { top: 16, bottom: 16 },
                }}
            />
        </div>
    );
}
