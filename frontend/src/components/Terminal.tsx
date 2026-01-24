'use client';

import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';

export default function Terminal() {
    const { terminals, activeTerminalId, sendTerminalInput } = useApp();
    const outputRef = useRef<HTMLDivElement>(null);
    const [input, setInput] = useState('');

    const activeTerminal = activeTerminalId ? terminals.get(activeTerminalId) : null;

    // Auto-scroll to bottom
    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [activeTerminal?.output]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && activeTerminalId) {
            sendTerminalInput(activeTerminalId, input + '\n');
            setInput('');
        }
    };

    if (!activeTerminal) {
        return (
            <div style={{ padding: '16px', color: 'var(--text-muted)' }}>
                No terminal session available
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="panel-content" ref={outputRef} style={{ flex: 1, overflow: 'auto' }}>
                <div className="terminal-output">
                    {!activeTerminal ? (
                        <div style={{ padding: '16px', color: 'var(--text-muted)' }}>
                            No active terminal. Click + to create one.
                        </div>
                    ) : (
                        activeTerminal.output.map((line, index) => (
                            <div key={index} className="terminal-line">
                                {line}
                            </div>
                        ))
                    )}
                </div>
            </div>
            <form onSubmit={handleSubmit} style={{ borderTop: '1px solid var(--bg-border)', padding: '8px' }}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type command and press Enter..."
                    style={{
                        width: '100%',
                        background: 'var(--bg-editor)',
                        border: '1px solid var(--bg-border)',
                        color: 'var(--text-primary)',
                        padding: '6px 8px',
                        fontFamily: 'var(--font-family)',
                        fontSize: '13px',
                    }}
                />
            </form>
        </div>
    );
}
