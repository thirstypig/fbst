
import React, { ReactNode } from 'react';
import PageHeader from '../ui/PageHeader';

interface AuctionLayoutProps {
  stage: ReactNode;
  context: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
}

export default function AuctionLayout({ stage, context, title, subtitle }: AuctionLayoutProps) {
  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-[var(--fbst-surface-primary)] text-[var(--fbst-text-primary)]">
       {title && (
         <PageHeader title={title} subtitle={subtitle} className="border-b border-[var(--fbst-table-border)] px-4" />
       )}
      {/* Mobile: Top Section (Stage), Desktop: Left Column */}
      <div className="flex flex-col md:flex-row h-full overflow-hidden">
        
        {/* Stage Section (Active Bid) */}
        <section className="
          shrink-0 
          md:w-[400px] lg:w-[450px] 
          border-b md:border-b-0 md:border-r 
          border-[var(--fbst-table-border)]
          bg-[var(--fbst-surface-secondary)]
          overflow-y-auto
        ">
          <div className="p-4 h-full flex flex-col">
            {stage}
          </div>
        </section>

        {/* Context Deck (Tabs & Data) */}
        <section className="flex-1 overflow-hidden relative flex flex-col bg-[var(--fbst-surface-primary)]">
          {context}
        </section>
      </div>
    </div>
  );
}
