'use client';

import { useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';

export default function OutputPanel() {
    const { executionOutput } = useApp();
    const outputRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [executionOutput]);

    return (
        <div className="panel-content" ref={outputRef}>
            {executionOutput.length === 0 && (
                <div style={{ color: 'var(--text-muted)' }}>No output yet. Run a file to see results.</div>
            )}
            {executionOutput.map((line, index) => {
                const isError = line.startsWith('[ERROR]');
                const isSuccess = line.includes('completed');
                return (
                    <div
                        key={index}
                        className={`output-line ${isError ? 'output-stderr' : isSuccess ? 'output-success' : 'output-stdout'}`}
                    >
                        {line}
                    </div>
                );
            })}
        </div>
    );
}
