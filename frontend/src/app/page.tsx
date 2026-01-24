'use client';

import MenuBar from '@/components/MenuBar';
import FileExplorer from '@/components/FileExplorer';
import EditorTabs from '@/components/EditorTabs';
import Editor from '@/components/Editor';
import BottomPanel from '@/components/BottomPanel';
import StatusBar from '@/components/StatusBar';

export default function Home() {
    return (
        <div className="layout-container">
            <MenuBar />
            <div className="main-content">
                <div className="sidebar">
                    <FileExplorer />
                </div>
                <div className="editor-area">
                    <div className="editor-container">
                        <EditorTabs />
                        <Editor />
                    </div>
                    <BottomPanel />
                </div>
            </div>
            {/* <StatusBar /> */}
        </div>
    );
}
