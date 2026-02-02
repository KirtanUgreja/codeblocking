"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { useIdeStore } from "@/store/ide-store";
import { terminalSocket } from "@/lib/terminalSocket";
import { X, Terminal as TerminalIcon, Maximize2, PlugZap, Loader2 } from "lucide-react";
import "@xterm/xterm/css/xterm.css";

// Custom theme for xterm to match our app
const terminalTheme = {
    background: "#0a0a0c",
    foreground: "#f8f9fa",
    cursor: "#3b82f6",
    selectionBackground: "#3b82f640",
    black: "#0a0a0c",
    red: "#ef4444",
    green: "#22c55e",
    yellow: "#eab308",
    blue: "#3b82f6",
    magenta: "#d946ef",
    cyan: "#06b6d4",
    white: "#f8f9fa",
    brightBlack: "#52525b",
    brightRed: "#f87171",
    brightGreen: "#4ade80",
    brightYellow: "#facc15",
    brightBlue: "#60a5fa",
    brightMagenta: "#e879f9",
    brightCyan: "#22d3ee",
    brightWhite: "#ffffff",
};

export default function TerminalPanel() {
    const containerRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const { toggleTerminal } = useIdeStore();
    const [isConnecting, setIsConnecting] = useState(true); // Start as true to avoid flash
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!containerRef.current) return;

        const term = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            theme: terminalTheme,
            allowProposedApi: true,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        term.open(containerRef.current);
        fitAddon.fit();

        terminalRef.current = term;
        fitAddonRef.current = fitAddon;

        // Custom key handler to intercept browser shortcuts for copy/paste
        term.attachCustomKeyEventHandler((event) => {
            // Handle Ctrl+Shift+C for copy (use event.code for reliability)
            if (event.ctrlKey && event.shiftKey && (event.code === 'KeyC' || event.key.toLowerCase() === 'c')) {
                event.preventDefault();
                event.stopPropagation();
                if (event.type === 'keydown') {
                    const selection = term.getSelection();
                    if (selection) {
                        navigator.clipboard.writeText(selection);
                    }
                }
                return false; // Prevent browser/xterm from handling this
            }

            // Handle Ctrl+Shift+V for paste
            if (event.ctrlKey && event.shiftKey && (event.code === 'KeyV' || event.key.toLowerCase() === 'v')) {
                event.preventDefault();
                event.stopPropagation();
                if (event.type === 'keydown') {
                    navigator.clipboard.readText().then((text) => {
                        terminalSocket.write(text);
                    });
                }
                return false; // Prevent browser/xterm from handling this
            }

            return true; // Let xterm handle all other keys
        });

        // Initial greeting
        term.writeln('\x1b[1;34mCodeBlocking IDE\x1b[0m v1.0.0');
        term.writeln('Connecting to backend terminal...');

        // Setup terminal socket handlers
        terminalSocket.onData((data) => {
            term.write(data);
        });

        terminalSocket.onReady(() => {
            setIsConnected(true);
            setIsConnecting(false);
            term.clear();
            term.writeln('\x1b[1;32m✓ Connected to backend terminal\x1b[0m');
        });

        terminalSocket.onExit(() => {
            setIsConnected(false);
            term.writeln('\x1b[1;31mTerminal session ended\x1b[0m');
        });

        // Connect to backend (initial connection state already set in useState)
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

        // Resize observer for the container itself
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
    }, []);

    const handleReconnect = () => {
        if (terminalRef.current) {
            terminalRef.current.clear();
            terminalRef.current.writeln('Reconnecting...');
        }
        setIsConnecting(true);
        terminalSocket.connect();
    };

    return (
        <div className="h-full w-full flex flex-col bg-card border-t border-border">
            <div className="h-9 px-4 flex items-center justify-between border-b border-border bg-card/50">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <TerminalIcon className="w-3.5 h-3.5" />
                    <span>Terminal</span>
                    {isConnecting && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                    {isConnected && <span className="w-2 h-2 rounded-full bg-green-500" />}
                </div>
                <div className="flex items-center gap-2">
                    {!isConnected && !isConnecting && (
                        <button
                            onClick={handleReconnect}
                            className="p-1 hover:bg-secondary rounded-sm text-muted-foreground hover:text-foreground transition-colors"
                            title="Reconnect"
                        >
                            <PlugZap className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <button
                        onClick={() => {/* Toggle maximize logic */ }}
                        className="p-1 hover:bg-secondary rounded-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={toggleTerminal}
                        className="p-1 hover:bg-destructive/10 hover:text-destructive rounded-sm text-muted-foreground transition-colors"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
            <div
                ref={containerRef}
                className="flex-1 p-2 overflow-hidden bg-background"
                style={{ paddingLeft: '12px' }}
            />
        </div>
    );
}
