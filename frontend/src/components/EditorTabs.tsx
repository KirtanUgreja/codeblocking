'use client';

import { useApp } from '@/context/AppContext';

export default function EditorTabs() {
    const { openFiles, activeFilePath, setActiveFile, closeFile } = useApp();

    const tabs = Array.from(openFiles.values());

    if (tabs.length === 0) {
        return null;
    }

    return (
        <div className="editor-tabs">
            {tabs.map((file) => {
                const fileName = file.path.split('/').pop() || file.path;
                const isActive = activeFilePath === file.path;

                return (
                    <div
                        key={file.path}
                        className={`editor-tab ${isActive ? 'active' : ''}`}
                        onClick={() => setActiveFile(file.path)}
                    >
                        {fileName}
                        {file.isDirty && ' •'}
                        <button
                            className="close-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                closeFile(file.path);
                            }}
                        >
                            ×
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
