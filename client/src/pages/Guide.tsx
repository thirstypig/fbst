import React from 'react';
import PageHeader from '../components/ui/PageHeader';

export default function Guide() {
  return (
    <div className="max-w-4xl mx-auto pb-10">
      <PageHeader 
        title="League Guide" 
        subtitle="Everything you need to know about the league format, scoring, and platform."
      />

      <div className="space-y-12">
        {/* Section 1: Overview */}
        <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h2 className="text-2xl font-bold text-[var(--fbst-text-heading)] mb-4">Overview</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            Welcome to the league! This is a comprehensive fantasy baseball experience combining standard 5x5 scoring with the excitement of a daily auction draft.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="bg-slate-800/50 p-4 rounded-lg">
              <div className="font-semibold text-white mb-1">Format</div>
              <div className="text-sm text-slate-400">Fantasy (5x5)</div>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-lg">
              <div className="font-semibold text-white mb-1">Draft Type</div>
              <div className="text-sm text-slate-400">Auction Draft</div>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-lg">
              <div className="font-semibold text-white mb-1">Season</div>
              <div className="text-sm text-slate-400">Full MLB Season (No Playoffs)</div>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-lg">
              <div className="font-semibold text-white mb-1">Teams</div>
              <div className="text-sm text-slate-400">8 Teams</div>
            </div>
          </div>
        </section>

        {/* Section 2: Hitting Scoring */}
        <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-[var(--fbst-text-heading)] mb-4 flex items-center gap-2">
            <span className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-lg">⚾</span>
            Hitting Categories
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
             {['Runs (R)', 'Home Runs (HR)', 'RBIs', 'Stolen Bases (SB)', 'Batting Avg (AVG)'].map(cat => (
                 <div key={cat} className="px-3 py-2 bg-slate-800 text-slate-200 text-sm font-medium rounded text-center border border-slate-700">
                     {cat}
                 </div>
             ))}
          </div>
          <p className="mt-4 text-sm text-slate-400 italic">
            * Standard 5x5 Scoring Categories.
          </p>
        </section>

        {/* Section 3: Pitching Scoring */}
        <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-[var(--fbst-text-heading)] mb-4 flex items-center gap-2">
            <span className="p-1.5 bg-green-500/20 text-green-400 rounded-lg text-lg">🎯</span>
            Pitching Categories
          </h2>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
             {['Wins (W)', 'Strikeouts (K)', 'ERA', 'WHIP', 'Saves (S)'].map(cat => (
                 <div key={cat} className="px-3 py-2 bg-slate-800 text-slate-200 text-sm font-medium rounded text-center border border-slate-700">
                     {cat}
                 </div>
             ))}
          </div>
        </section>

        {/* Section 4: Platform Features */}
        <section className="space-y-4">
             <h2 className="text-xl font-bold text-[var(--fbst-text-heading)]">Platform Features</h2>
             
             <div className="bg-slate-800/30 p-5 rounded-lg border-l-4 border-purple-500">
                 <h3 className="font-semibold text-white mb-2">Period Waivers</h3>
                 <p className="text-sm text-slate-400">
                     Waivers run periodically. Roster moves are made via waiver claims, not daily lineup changes.
                 </p>
             </div>

             <div className="bg-slate-800/30 p-5 rounded-lg border-l-4 border-yellow-500">
                 <h3 className="font-semibold text-white mb-2">Auction Draft</h3>
                 <p className="text-sm text-slate-400">
                     Players are acquired via a live auction draft. Manage your budget wisely.
                 </p>
             </div>

              <div className="bg-slate-800/30 p-5 rounded-lg border-l-4 border-cyan-500">
                 <h3 className="font-semibold text-white mb-2">Live Stat Tracking</h3>
                 <p className="text-sm text-slate-400">
                     Standings and player stats update in near real-time. Check back often to track your progress.
                 </p>
             </div>
        </section>

         {/* Footer / Contact */}
         <section className="text-center pt-8 border-t border-slate-800">
             <p className="text-slate-500">
                 Have questions? Contact your league commissioner.
             </p>
         </section>
      </div>
    </div>
  );
}
