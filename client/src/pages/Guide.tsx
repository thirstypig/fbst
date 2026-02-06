import React from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';

export default function Guide() {
  return (
    <div className="max-w-4xl mx-auto pb-20">
      <PageHeader 
        title="League Guide" 
        subtitle="The definitive handbook for this league's format, scoring, and operations."
        rightElement={
          <Link 
            to="/rules" 
            className="px-6 py-3 text-sm font-bold text-white bg-[var(--fbst-accent)] rounded-2xl shadow-lg shadow-red-500/30 hover:scale-105 active:scale-95 transition-all"
          >
            Manage League Rules
          </Link>
        }
      />

      {/* Top Banner Context */}
      <div className="mb-12 p-6 liquid-glass rounded-3xl border-l-4 border-[var(--fbst-accent)]">
        <p className="text-sm font-semibold text-[var(--fbst-text-primary)] leading-relaxed">
          <span className="text-[var(--fbst-accent)] font-bold">Note:</span> These are the specific rules for this league. 
          The <Link to="/rules" className="underline font-bold hover:text-[var(--fbst-accent)] transition-colors">Rules Page</Link> is where administrators can modify these settings, which will automatically update this guide.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Section 1: Overview */}
        <section className="liquid-glass rounded-3xl p-8">
          <h2 className="text-2xl font-black tracking-tight text-[var(--fbst-text-heading)] mb-6">Execution Overview</h2>
          <p className="text-[var(--fbst-text-secondary)] leading-relaxed mb-8">
            This experience combines meticulous 5x5 statistical tracking with the high-stakes environment of a daily auction draft.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Format', value: 'Head-to-Head (5x5)' },
              { label: 'Market', value: 'Live Auction Draft' },
              { label: 'Timeline', value: 'Full MLB Season' },
              { label: 'Capacity', value: '8 Professional Teams' },
            ].map((item, idx) => (
              <div key={idx} className="bg-white/5 p-4 rounded-2xl border border-white/5">
                <div className="text-[10px] uppercase tracking-widest font-bold text-[var(--fbst-text-muted)] mb-1">{item.label}</div>
                <div className="text-sm font-bold text-[var(--fbst-text-primary)]">{item.value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Hitting Scoring */}
        <section className="liquid-glass rounded-3xl p-8">
          <h2 className="text-xl font-bold text-[var(--fbst-text-heading)] mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 bg-blue-500/20 text-blue-400 rounded-xl text-sm">⚾</span>
            Hitting Categories
          </h2>
          <div className="flex flex-wrap gap-2">
             {['Runs (R)', 'Home Runs (HR)', 'RBIs', 'Stolen Bases (SB)', 'Batting Avg (AVG)'].map(cat => (
                 <div key={cat} className="px-4 py-2 bg-white/5 text-[var(--fbst-text-primary)] text-xs font-bold rounded-xl border border-white/10">
                     {cat}
                 </div>
             ))}
          </div>
        </section>

        {/* Section 3: Pitching Scoring */}
        <section className="liquid-glass rounded-3xl p-8">
          <h2 className="text-xl font-bold text-[var(--fbst-text-heading)] mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm">🎯</span>
            Pitching Categories
          </h2>
           <div className="flex flex-wrap gap-2">
             {['Wins (W)', 'Strikeouts (K)', 'ERA', 'WHIP', 'Saves (S)'].map(cat => (
                 <div key={cat} className="px-4 py-2 bg-white/5 text-[var(--fbst-text-primary)] text-xs font-bold rounded-xl border border-white/10">
                     {cat}
                 </div>
             ))}
          </div>
        </section>

        {/* Section 4: Operational Pillars */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="liquid-glass p-6 rounded-3xl">
                 <h3 className="font-bold text-[var(--fbst-text-primary)] mb-3">Period Waivers</h3>
                 <p className="text-xs text-[var(--fbst-text-secondary)] leading-relaxed">
                     Market adjustments occur via waiver cycles. Strategic long-term planning is prioritized over daily twitch reactions.
                 </p>
             </div>

             <div className="liquid-glass p-6 rounded-3xl border-b-4 border-amber-500/50">
                 <h3 className="font-bold text-[var(--fbst-text-primary)] mb-3">Auction Market</h3>
                 <p className="text-xs text-[var(--fbst-text-secondary)] leading-relaxed">
                     Every asset has a price. Success is defined by value extraction from the available capital pool.
                 </p>
             </div>

              <div className="liquid-glass p-6 rounded-3xl">
                 <h3 className="font-bold text-[var(--fbst-text-primary)] mb-3">Real-time Analytics</h3>
                 <p className="text-xs text-[var(--fbst-text-secondary)] leading-relaxed">
                     Data ingestion is constant. Use the dashboard to monitor high-fidelity stat tracking across the entire league.
                 </p>
             </div>
        </section>

         {/* Footer */}
         <section className="text-center pt-8">
             <p className="text-[var(--fbst-text-muted)] text-sm font-medium">
                 Official Rules Document &copy; 2026 FBST Protocol
             </p>
         </section>
      </div>
    </div>
  );
}
