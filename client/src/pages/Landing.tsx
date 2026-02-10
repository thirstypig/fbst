import React from "react";
import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="min-h-screen bg-[var(--lg-bg-page)] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-3xl animate-in fade-in zoom-in-95 duration-1000">
        <div className="w-24 h-24 rounded-3xl bg-[var(--lg-accent)] flex items-center justify-center text-white font-black text-4xl shadow-2xl shadow-blue-500/40 transform -rotate-6 hover:rotate-0 transition-transform duration-700 mx-auto mb-12">
          FB
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-[var(--lg-text-heading)] mb-6 leading-none uppercase">
          FBST <span className="text-[var(--lg-accent)]">Protocol</span>
        </h1>
        
        <p className="text-xl md:text-2xl font-medium text-[var(--lg-text-secondary)] mb-12 leading-relaxed opacity-60 max-w-2xl mx-auto">
          The next-generation intelligence system for tactical baseball management. Personnel synchronization, kinematic matrices, and sector analysis at your command.
        </p>

        <div className="flex flex-col md:flex-row items-center justify-center gap-6">
          <Link 
            to="/login" 
            className="lg-button lg-button-primary px-12 py-4 text-lg shadow-2xl shadow-blue-500/30 w-full md:w-auto"
          >
            Access Terminal
          </Link>
          <Link 
            to="/signup" 
            className="lg-button lg-button-secondary px-12 py-4 text-lg w-full md:w-auto"
          >
            Initialize New Link
          </Link>
        </div>

        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 text-left border-t border-white/5 pt-12">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--lg-accent)] mb-2">Module 01</div>
            <h3 className="text-lg font-black text-[var(--lg-text-heading)] mb-2 uppercase">Neural Roster</h3>
            <p className="text-xs text-[var(--lg-text-muted)] leading-relaxed">Advanced personnel management with real-time stat synchronization.</p>
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-2">Module 02</div>
            <h3 className="text-lg font-black text-[var(--lg-text-heading)] mb-2 uppercase">Deep Standings</h3>
            <p className="text-xs text-[var(--lg-text-muted)] leading-relaxed">Multi-period intelligence gathering and performance projections.</p>
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400 mb-2">Module 03</div>
            <h3 className="text-lg font-black text-[var(--lg-text-heading)] mb-2 uppercase">Tactical Trade</h3>
            <p className="text-xs text-[var(--lg-text-muted)] leading-relaxed">Secure asset transfer protocols with built-in validity checking.</p>
          </div>
        </div>
      </div>

      <div className="fixed bottom-8 left-0 right-0 pointer-events-none opacity-20">
        <div className="text-[10px] font-black uppercase tracking-[1em] text-[var(--lg-text-muted)]">
          SECURE PROTOCOL // EST 2026
        </div>
      </div>
    </div>
  );
}
