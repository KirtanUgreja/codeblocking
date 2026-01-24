'use client';

import { useApp } from '@/context/AppContext';

export default function StatusBar() {
    const { isExecuting, activeFilePath } = useApp();

    const getLanguage = (filePath: string | null): string => {
        if (!filePath) return '';
        const ext = filePath.split('.').pop()?.toUpperCase();
        return ext || 'TXT';
    };

    return (
        <div className="status-bar">
            <div className="status-bar-section">
                <div className="status-bar-item">{getLanguage(activeFilePath)}</div>
                {activeFilePath && <div className="status-bar-item">{activeFilePath}</div>}
            </div>
            <div className="status-bar-section">
                {isExecuting && <div className="status-bar-item">⚙️ Executing...</div>}
            </div>
        </div>
    );
}
