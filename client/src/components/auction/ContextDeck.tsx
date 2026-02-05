
import React, { useState } from 'react';

interface TabItem {
  key: string;
  label: string;
  count?: number;
  content: React.ReactNode;
}

interface ContextDeckProps {
  tabs: TabItem[];
}

export default function ContextDeck({ tabs }: ContextDeckProps) {
  const [activeKey, setActiveKey] = useState(tabs[0].key);

  const activeTab = tabs.find(t => t.key === activeKey) || tabs[0];

  return (
    <div className="flex flex-col h-full w-full">
      {/* Tab Bar */}
      <div className="flex items-center gap-1 px-2 pt-2 border-b border-[var(--fbst-table-border)] bg-[var(--fbst-surface-secondary)]">
        {tabs.map((tab) => {
          const isActive = activeKey === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveKey(tab.key)}
              className={`
                relative px-4 py-3 text-sm font-semibold rounded-t-lg transition-colors
                ${isActive 
                  ? 'bg-[var(--fbst-surface-primary)] text-[var(--fbst-accent-primary)] border-x border-t border-[var(--fbst-table-border)] -mb-px border-b-transparent z-10' 
                  : 'text-[var(--fbst-text-muted)] hover:text-[var(--fbst-text-primary)] hover:bg-[var(--fbst-surface-primary)]/50'
                }
              `}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-[var(--fbst-accent-primary)]/10' : 'bg-[var(--fbst-table-border)]'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-hidden relative bg-[var(--fbst-surface-primary)]">
        {activeTab.content}
      </div>
    </div>
  );
}
