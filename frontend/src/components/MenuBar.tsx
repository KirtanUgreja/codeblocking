'use client';

import { useApp } from '@/context/AppContext';

export default function MenuBar() {
    const { activeFilePath, isExecuting, executeFile, stopExecution } = useApp();

    const handleRun = () => {
        if (activeFilePath && !isExecuting) {
            executeFile(activeFilePath);
        }
    };

    const handleStop = () => {
        if (isExecuting) {
            stopExecution();
        }
    };

    return (
        <div className="menu-bar">
            <div className="menu-item">File</div>
            <div className="menu-item">Edit</div>
            <div className="menu-item">View</div>
            <div className="menu-item">Go</div>
            <div className="menu-item">Run</div>
            <div className="menu-item">Terminal</div>
            <div className="menu-item">Help</div>

            <div style={{ flex: 1 }} />

            <div style={{ display: 'flex', gap: '8px', paddingRight: '8px' }}>
                <button
                    className="icon-button"
                    onClick={handleRun}
                    disabled={!activeFilePath || isExecuting}
                    title="Run Code"
                    style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                    <span style={{ color: 'var(--color-success)' }}>▶</span> Run
                </button>
                <button
                    className="icon-button"
                    onClick={handleStop}
                    disabled={!isExecuting}
                    title="Stop Execution"
                    style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                    <span style={{ color: 'var(--color-error)' }}>■</span> Stop
                </button>
            </div>
        </div>
    );
}
