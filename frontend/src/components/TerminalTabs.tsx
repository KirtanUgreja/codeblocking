'use client';

import { useApp } from '@/context/AppContext';

export default function TerminalTabs() {
    const { terminals, activeTerminalId, createTerminal, closeTerminal, setActiveTerminal } = useApp();

    const terminalList = Array.from(terminals.values());

    return (
        <div className="terminal-tabs">
            {terminalList.map((terminal, index) => (
                <button
                    key={terminal.id}
                    className={`terminal-tab ${activeTerminalId === terminal.id ? 'active' : ''}`}
                    onClick={() => setActiveTerminal(terminal.id)}
                >
                    Terminal {index + 1}
                    <span
                        className="close-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (terminalList.length > 1) {
                                closeTerminal(terminal.id);
                            }
                        }}
                    >
                        ×
                    </span>
                </button>
            ))}
            <button className="terminal-tab new-terminal-btn" onClick={createTerminal} title="New Terminal">
                +
            </button>
        </div>
    );
}
