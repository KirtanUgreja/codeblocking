"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { useIdeStore } from "@/store/ide-store";
import { terminalSocket } from "@/lib/terminalSocket";
import { X, Terminal as TerminalIcon, Maximize2, PlugZap, Loader2 } from "lucide-react";
import "@xterm/xterm/css/xterm.css";

// Custom theme for xterm to match VS Code dark theme
const terminalTheme = {
    background: "#1e1e1e",
    foreground: "#cccccc",
    cursor: "#aeafad",
    selectionBackground: "#264f78",
    black: "#000000",
    red: "#cd3131",
    green: "#0dbc79",
    yellow: "#e5e510",
    blue: "#2472c8",
    magenta: "#bc3fbc",
    cyan: "#11a8cd",
    white: "#e5e5e5",
    brightBlack: "#666666",
    brightRed: "#f14c4c",
    brightGreen: "#23d18b",
    brightYellow: "#f5f543",
    brightBlue: "#3b8eea",
    brightMagenta: "#d670d6",
    brightCyan: "#29b8db",
    brightWhite: "#ffffff",
};

export default function TerminalPanel() {
    const containerRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const { toggleTerminal, projectId } = useIdeStore();
    const [isConnecting, setIsConnecting] = useState(true);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!containerRef.current) return;

        const term = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
            theme: terminalTheme,
            allowProposedApi: true,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        term.open(containerRef.current);
        fitAddon.fit();

        terminalRef.current = term;
        fitAddonRef.current = fitAddon;

        // Custom key handler for copy/paste
        term.attachCustomKeyEventHandler((event) => {
            if (event.ctrlKey && event.shiftKey && (event.code === 'KeyC' || event.key.toLowerCase() === 'c')) {
                event.preventDefault();
                event.stopPropagation();
                if (event.type === 'keydown') {
                    const selection = term.getSelection();
                    if (selection) {
                        navigator.clipboard.writeText(selection);
                    }
                }
                return false;
            }

            if (event.ctrlKey && event.shiftKey && (event.code === 'KeyV' || event.key.toLowerCase() === 'v')) {
                event.preventDefault();
                event.stopPropagation();
                if (event.type === 'keydown') {
                    navigator.clipboard.readText().then((text) => {
                        terminalSocket.write(text);
                    });
                }
                return false;
            }

            return true;
        });

        // Initial greeting
        term.writeln('\x1b[1;34mCodeBlocking IDE\x1b[0m v1.0.0');
        term.writeln('Connecting to Docker container...');

        // Setup terminal socket handlers
        terminalSocket.onData((data) => {
            term.write(data);
        });

        terminalSocket.onReady(() => {
            setIsConnected(true);
            setIsConnecting(false);
            term.clear();
            term.writeln('\x1b[1;32m✓ Connected to Docker container\x1b[0m');
            term.writeln('');
        });

        terminalSocket.onExit(() => {
            setIsConnected(false);
            term.writeln('\x1b[1;31mContainer session ended\x1b[0m');
        });

        // Connect to backend
        terminalSocket.connect();

        // Forward terminal input to backend
        term.onData((data) => {
            terminalSocket.write(data);
        });

        const handleResize = () => {
            fitAddon.fit();
            if (terminalRef.current) {
                terminalSocket.resize(terminalRef.current.cols, terminalRef.current.rows);
            }
        };

        window.addEventListener('resize', handleResize);

        const resizeObserver = new ResizeObserver(() => {
            fitAddon.fit();
            if (terminalRef.current) {
                terminalSocket.resize(terminalRef.current.cols, terminalRef.current.rows);
            }
        });
        resizeObserver.observe(containerRef.current);

        return () => {
            term.dispose();
            terminalSocket.disconnect();
            window.removeEventListener('resize', handleResize);
            resizeObserver.disconnect();
        };
    }, [projectId]);

    const handleReconnect = () => {
        if (terminalRef.current) {
            terminalRef.current.clear();
            terminalRef.current.writeln('Reconnecting to container...');
        }
        setIsConnecting(true);
        terminalSocket.connect();
    };

    return (
        <div className="h-full w-full flex flex-col bg-[#1e1e1e] border-t border-[#3c3c3c]">
            <div className="h-9 px-4 flex items-center justify-between border-b border-[#3c3c3c] bg-[#252526]">
                <div className="flex items-center gap-2 text-xs font-medium text-[#cccccc] uppercase tracking-wider">
                    <TerminalIcon className="w-3.5 h-3.5" />
                    <span>Terminal</span>
                    {isConnecting && <Loader2 className="w-3 h-3 animate-spin text-[#007acc]" />}
                    {isConnected && <span className="w-2 h-2 rounded-full bg-green-500" />}
                </div>
                <div className="flex items-center gap-2">
                    {!isConnected && !isConnecting && (
                        <button
                            onClick={handleReconnect}
                            className="p-1 hover:bg-[#3c3c3c] rounded-sm text-[#cccccc] hover:text-white transition-colors"
                            title="Reconnect"
                        >
                            <PlugZap className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <button
                        onClick={() => { }}
                        className="p-1 hover:bg-[#3c3c3c] rounded-sm text-[#cccccc] hover:text-white transition-colors"
                    >
                        <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={toggleTerminal}
                        className="p-1 hover:bg-[#3c3c3c] rounded-sm text-[#cccccc] hover:text-white transition-colors"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
            <div
                ref={containerRef}
                className="flex-1 p-2 overflow-hidden bg-[#1e1e1e]"
                style={{ paddingLeft: '12px' }}
            />
        </div>
    );
}
