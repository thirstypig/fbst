
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
    <div className="flex flex-col h-full w-full liquid-glass backdrop-blur-3xl">
      {/* Tab Bar */}
      <div className="flex items-center gap-1 p-2 bg-white/5 border-b border-white/10">
        {tabs.map((tab) => {
          const isActive = activeKey === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveKey(tab.key)}
              className={`
                relative px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all
                ${isActive 
                  ? 'bg-[var(--fbst-accent)] text-white shadow-lg shadow-red-500/10' 
                  : 'text-[var(--fbst-text-muted)] hover:text-[var(--fbst-text-primary)] hover:bg-white/5'
                }
              `}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`ml-2 text-[10px] tabular-nums ${isActive ? 'text-white/50' : 'text-white/30'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab.content}
      </div>
    </div>
  );
}
