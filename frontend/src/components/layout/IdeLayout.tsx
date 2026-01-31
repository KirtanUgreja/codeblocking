"use client";

import { useState, useRef, useEffect } from "react";
import { useIdeStore } from "@/store/ide-store";

import FileExplorer from "@/components/explorer/FileExplorer";
import CodeEditor from "@/components/editor/CodeEditor";
import TerminalPanel from "@/components/terminal/TerminalPanel";

export default function IdeLayout() {
    const { isSidebarOpen, isTerminalOpen } = useIdeStore();

    // Panel sizes as percentages
    const [sidebarWidth, setSidebarWidth] = useState(20);
    const [terminalHeight, setTerminalHeight] = useState(30);

    // Refs for drag handling
    const isDraggingSidebar = useRef(false);
    const isDraggingTerminal = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Store handlers in refs - updated in effect
    const handlersRef = useRef({
        handleMouseMove: (e: MouseEvent) => { },
        handleMouseUp: () => { }
    });

    // Set up handlers in effect to avoid ref access during render
    useEffect(() => {
        handlersRef.current.handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();

            if (isDraggingSidebar.current) {
                const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
                setSidebarWidth(Math.max(10, Math.min(80, newWidth)));
            }

            if (isDraggingTerminal.current) {
                const mainAreaHeight = rect.height;
                const terminalTop = e.clientY - rect.top;
                const newHeight = ((mainAreaHeight - terminalTop) / mainAreaHeight) * 100;
                setTerminalHeight(Math.max(10, Math.min(80, newHeight)));
            }
        };

        handlersRef.current.handleMouseUp = () => {
            isDraggingSidebar.current = false;
            isDraggingTerminal.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            window.removeEventListener('mousemove', handlersRef.current.handleMouseMove);
            window.removeEventListener('mouseup', handlersRef.current.handleMouseUp);
        };

        // Cleanup on unmount
        return () => {
            window.removeEventListener('mousemove', handlersRef.current.handleMouseMove);
            window.removeEventListener('mouseup', handlersRef.current.handleMouseUp);
        };
    }, []);

    // Start sidebar drag
    const startSidebarDrag = (e: React.MouseEvent) => {
        e.preventDefault();
        isDraggingSidebar.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        window.addEventListener('mousemove', handlersRef.current.handleMouseMove);
        window.addEventListener('mouseup', handlersRef.current.handleMouseUp);
    };

    // Start terminal drag
    const startTerminalDrag = (e: React.MouseEvent) => {
        e.preventDefault();
        isDraggingTerminal.current = true;
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
        window.addEventListener('mousemove', handlersRef.current.handleMouseMove);
        window.addEventListener('mouseup', handlersRef.current.handleMouseUp);
    };

    return (
        <div ref={containerRef} className="h-screen w-full bg-background text-foreground overflow-hidden flex flex-col">
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                {isSidebarOpen && (
                    <>
                        <div
                            className="h-full bg-card/30 border-r border-border/50 overflow-hidden"
                            style={{ width: `${sidebarWidth}%` }}
                        >
                            <FileExplorer />
                        </div>

                        {/* Sidebar Resize Handle */}
                        <div
                            className="w-1 h-full bg-border/20 hover:bg-primary/50 cursor-col-resize transition-colors flex-shrink-0"
                            onMouseDown={startSidebarDrag}
                        />
                    </>
                )}

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Editor */}
                    <div
                        className="overflow-hidden relative"
                        style={{ height: isTerminalOpen ? `${100 - terminalHeight}%` : '100%' }}
                    >
                        <CodeEditor />
                    </div>

                    {/* Terminal */}
                    {isTerminalOpen && (
                        <>
                            {/* Terminal Resize Handle */}
                            <div
                                className="h-1 w-full bg-border/20 hover:bg-primary/50 cursor-row-resize transition-colors flex-shrink-0"
                                onMouseDown={startTerminalDrag}
                            />

                            <div
                                className="overflow-hidden"
                                style={{ height: `${terminalHeight}%` }}
                            >
                                <TerminalPanel />
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Status Bar */}
            <div className="h-6 bg-primary/10 border-t border-border flex items-center px-3 text-[10px] text-primary select-none justify-between flex-shrink-0">
                <div className="flex items-center gap-4">
                    <span>master*</span>
                    <span>0 errors</span>
                </div>
                <div className="flex items-center gap-4">
                    <span>Ln 1, Col 1</span>
                    <span>UTF-8</span>
                    <span>TypeScript</span>
                </div>
            </div>
        </div>
    );
}
