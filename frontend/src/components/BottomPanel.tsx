'use client';

import { useApp } from '@/context/AppContext';
import Terminal from './Terminal';
import OutputPanel from './OutputPanel';
import TerminalTabs from './TerminalTabs';

export default function BottomPanel() {
    const { bottomPanelTab, setBottomPanelTab, clearTerminal, activeTerminalId } = useApp();

    const handleClearTerminal = () => {
        if (activeTerminalId) {
            clearTerminal(activeTerminalId);
        }
    };

    return (
        <div className="bottom-panel">
            <div className="panel-tabs">
                <button
                    className={`panel-tab ${bottomPanelTab === 'terminal' ? 'active' : ''}`}
                    onClick={() => setBottomPanelTab('terminal')}
                >
                    Terminal
                </button>
                <button
                    className={`panel-tab ${bottomPanelTab === 'output' ? 'active' : ''}`}
                    onClick={() => setBottomPanelTab('output')}
                >
                    Output
                </button>
                {bottomPanelTab === 'terminal' && (
                    <button
                        className="panel-tab"
                        onClick={handleClearTerminal}
                        style={{ marginLeft: 'auto', opacity: 0.7 }}
                        title="Clear Terminal"
                    >
                        🗑️ Clear
                    </button>
                )}
            </div>
            {bottomPanelTab === 'terminal' && <TerminalTabs />}
            {bottomPanelTab === 'terminal' ? <Terminal /> : <OutputPanel />}
        </div>
    );
}
