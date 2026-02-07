
import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../auth/AuthProvider";

// --- Types ---
interface LeagueRule {
  id: number;
  leagueId: number;
  category: string;
  key: string;
  value: string;
  label: string;
  isLocked: boolean;
}

interface GroupedRules {
  [category: string]: LeagueRule[];
}

type RuleInputType = 'number' | 'text' | 'select' | 'slider' | 'checkbox_list' | 'json_object_counts' | 'toggle';

interface RuleConfig {
  type: RuleInputType;
  min?: number;
  max?: number;
  step?: number;
  options?: string[]; // for select
  listOptions?: string[]; // for checkbox_list items
  suffix?: string;
  dependsOn?: { key: string; value: string }; // simple visibility toggle
}

// --- Constants ---

const HITTING_CATS = ["R", "HR", "RBI", "SB", "AVG", "OPS", "OPS+", "WAR", "H", "2B", "3B", "BB", "K", "TB", "OBP", "SLG"];
const PITCHING_CATS = ["W", "SV", "K", "ERA", "ERA+", "WHIP", "WAR", "QS", "HLD", "IP", "CG", "SHO", "L", "BB", "HR"];
const POSITIONS = ["C", "1B", "2B", "3B", "SS", "MI", "CI", "OF", "DH", "P", "SP", "RP", "BN", "IL"];

const RULE_CONFIGS: Record<string, RuleConfig> = {
  // Overview
  team_count: { type: 'slider', min: 4, max: 16, step: 1 },
  stats_source: { type: 'select', options: ["NL", "AL", "MLB", "Other"] },

  // Roster
  pitcher_count: { type: 'slider', min: 1, max: 20 },
  batter_count: { type: 'slider', min: 1, max: 25 },
  roster_positions: { type: 'json_object_counts', listOptions: POSITIONS },

  // Scoring
  hitting_stats: { type: 'checkbox_list', listOptions: HITTING_CATS },
  pitching_stats: { type: 'checkbox_list', listOptions: PITCHING_CATS },
  min_innings: { type: 'select', options: ["10", "20", "30", "40", "50", "60", "70"] },

  // Draft
  draft_mode: { type: 'select', options: ["AUCTION", "DRAFT"] }, // Toggle requested, select is easier for enum
  draft_type: { type: 'select', options: ["SNAKE", "LINEAR"], dependsOn: { key: 'draft_mode', value: 'DRAFT' } },
  auction_budget: { type: 'number', dependsOn: { key: 'draft_mode', value: 'AUCTION' }, suffix: '$' },
  keeper_count: { type: 'slider', min: 0, max: 10, step: 1 },
  min_bid: { type: 'select', options: ["1", "2", "3", "4", "5"], suffix: '$' },

  // Bonuses
  grand_slam: { type: 'number', suffix: '$' },
  shutout: { type: 'number', suffix: '$' },
  cycle: { type: 'number', suffix: '$' },
  no_hitter: { type: 'number', suffix: '$' },
  perfect_game: { type: 'number', suffix: '$' },
  mvp: { type: 'number', suffix: '$' },
  cy_young: { type: 'number', suffix: '$' },
  roy: { type: 'number', suffix: '$' },

  // Payouts - should ideally sum to 100 but we'll leave that to user for now or add validator
  entry_fee: { type: 'number', suffix: '$' },
  payout_1st: { type: 'number', suffix: '%', min: 0, max: 100 },
  payout_2nd: { type: 'number', suffix: '%', min: 0, max: 100 },
  payout_3rd: { type: 'number', suffix: '%', min: 0, max: 100 },
  payout_4th: { type: 'number', suffix: '%', min: 0, max: 100 },
  payout_5th: { type: 'number', suffix: '%', min: 0, max: 100 },
  payout_6th: { type: 'number', suffix: '%', min: 0, max: 100 },
  payout_7th: { type: 'number', suffix: '%', min: 0, max: 100 },
  payout_8th: { type: 'number', suffix: '%', min: 0, max: 100 },
  
  // IL
  il_slot_1_cost: { type: 'number', suffix: '$' },
  il_slot_2_cost: { type: 'number', suffix: '$' },
};

import overviewIcon from '../assets/icons/overview.svg';
import rosterIcon from '../assets/icons/roster.svg';
import scoringIcon from '../assets/icons/scoring.svg';
import draftIcon from '../assets/icons/draft.svg';
import ilIcon from '../assets/icons/il.svg';
import bonusesIcon from '../assets/icons/bonuses.svg';
import payoutsIcon from '../assets/icons/payouts.svg';

const CATEGORY_ORDER = ["overview", "roster", "scoring", "draft", "il", "bonuses", "payouts"];
const CATEGORY_ICONS: Record<string, string> = {
  overview: overviewIcon,
  roster: rosterIcon,
  scoring: scoringIcon,
  draft: draftIcon,
  il: ilIcon,
  bonuses: bonusesIcon,
  payouts: payoutsIcon,
};

export default function Rules() {
  const { user } = useAuth();
  const [rules, setRules] = useState<LeagueRule[]>([]);
  const [grouped, setGrouped] = useState<GroupedRules>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({}); // Keyed by rule.key or rule.id? Using ID for updates.
  const [saving, setSaving] = useState(false);
  const [leagueId, setLeagueId] = useState<number | null>(null);
  
  // Rule map for dependencies (keyed by rule key)
  const ruleMap = useMemo(() => {
      const map: Record<string, string> = {};
      rules.forEach(r => map[r.key] = pendingChanges[r.id] ?? r.value);
      return map;
  }, [rules, pendingChanges]);

  // Auth check
  const canEdit = user?.isAdmin || false; // TODO: refined logic
  const isLocked = rules.some(r => r.isLocked);

  useEffect(() => {
    (async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/public/leagues"); // Get active league
            const d = await res.json();
            const lid = d.leagues?.[0]?.id || 1; // Default to 1
            setLeagueId(lid);

            const rulesRes = await fetch(`/api/leagues/${lid}/rules`);
            if(!rulesRes.ok) throw new Error("Failed to load rules");
            const rulesData = await rulesRes.json();
            
            setRules(rulesData.rules || []);
            setGrouped(rulesData.grouped || {});
        } catch(e: any) {
            setError(e.message || "Error loading rules");
        } finally {
            setLoading(false);
        }
    })();
  }, []);

  const handleChange = (id: number, val: string) => {
      setPendingChanges(prev => ({ ...prev, [id]: val }));
  };

  const handleSave = async () => {
      if(!leagueId) return;
      setSaving(true);
      try {
          const updates = Object.entries(pendingChanges).map(([id, value]) => ({ id: Number(id), value }));
          const res = await fetch(`/api/leagues/${leagueId}/rules`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ updates })
          });
          if(!res.ok) throw new Error("Failed to save");
          
          // Refresh
          const updatedRules = rules.map(r => pendingChanges[r.id] ? { ...r, value: pendingChanges[r.id] } : r);
          setRules(updatedRules);
          
          // Re-group
          const newGrouped = updatedRules.reduce((acc: any, r) => {
              if(!acc[r.category]) acc[r.category] = [];
              acc[r.category].push(r);
              return acc;
          }, {});
          setGrouped(newGrouped);
          
          setPendingChanges({});
          setEditMode(false);
      } catch(e: any) {
          alert(e.message);
      } finally {
          setSaving(false);
      }
  };

  if(loading) return <div className="p-8 text-center text-slate-400">Loading rules...</div>;
  if(error) return <div className="p-8 text-center text-red-400">Error: {error}</div>;

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
       <div className="flex items-center justify-between mb-12">
           <div>
               <h1 className="text-4xl font-black tracking-tight text-[var(--fbst-text-heading)]">Internal Protocols</h1>
               <p className="text-[var(--fbst-text-muted)] mt-2 font-medium">{isLocked ? "🔒 Strategic configurations are terminal for the current cycle." : "Modify active league parameters and governance rules."}</p>
           </div>
           
           {canEdit && !isLocked && (
               <div className="flex gap-3">
                   {editMode ? (
                       <div className="flex gap-4">
                           <button onClick={() => { setEditMode(false); setPendingChanges({}); }} className="px-6 py-2.5 rounded-2xl bg-white/5 text-[var(--fbst-text-primary)] hover:bg-white/10 transition-all font-black uppercase text-[10px] tracking-widest">Abort</button>
                           <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/5">
                               {saving ? "Syncing..." : "Commit Changes"}
                           </button>
                       </div>
                   ) : (
                       <button onClick={() => setEditMode(true)} className="px-8 py-3 rounded-2xl bg-[var(--fbst-accent)] text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-red-500/20 hover:scale-[1.02] transition-all">
                           Initialize Edit
                       </button>
                   )}
               </div>
           )}
       </div>

       <div className="space-y-8">
           {CATEGORY_ORDER.map(cat => {
               const catRules = grouped[cat];
               if(!catRules) return null;

               return (
                   <section key={cat} className="liquid-glass border border-white/10 rounded-[32px] overflow-hidden shadow-2xl bg-white/[0.02] backdrop-blur-xl">
                       <div className="bg-white/5 px-8 py-6 flex items-center gap-4 border-b border-white/10">
                            {CATEGORY_ICONS[cat] ? (
                                <img 
                                    src={CATEGORY_ICONS[cat]} 
                                    alt={cat} 
                                    className="w-8 h-8 opacity-80" 
                                    style={{ filter: 'var(--fbst-icon-filter)' }} 
                                />
                            ) : (
                                <span className="text-2xl">📄</span>
                            )}
                           <h2 className="text-xl font-black tracking-tight text-[var(--fbst-text-heading)] capitalize">{cat.replace('_', ' ')} Registry</h2>
                       </div>
                       <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                           {catRules.map(rule => {
                               const config = RULE_CONFIGS[rule.key] || { type: 'text' };
                               
                               // Check dependency
                               if (config.dependsOn) {
                                   const depVal = ruleMap[config.dependsOn.key];
                                   if (depVal !== config.dependsOn.value) return null;
                               }

                               const val = pendingChanges[rule.id] ?? rule.value;
                               const isEditing = editMode && !isLocked;

                               return (
                                   <div key={rule.id} className="space-y-2">
                                       <label className="block text-[10px] font-black text-[var(--fbst-text-muted)] uppercase tracking-[0.2em] opacity-60 ml-1">{rule.label}</label>
                                       <div>
                                           {RenderInput(rule, val, config, isEditing, (v) => handleChange(rule.id, v))}
                                       </div>
                                   </div>
                               );
                           })}
                       </div>
                   </section>
               );
           })}
       </div>
    </div>
  );
}

// Helper to render inputs
function RenderInput(rule: LeagueRule, val: string, config: RuleConfig, editing: boolean, onChange: (v: string) => void) {
    if (!editing) {
        // Read-only view
        if (config.type === 'checkbox_list' || config.type === 'json_object_counts') {
            try {
                const obj = JSON.parse(val);
                if (Array.isArray(obj)) return <div className="text-[var(--fbst-text-primary)] text-sm font-bold flex flex-wrap gap-2">{obj.map(item => (
                    <span key={item} className="bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">{item}</span>
                ))}</div>;
                return (
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(obj).map(([k, v]) => (
                            <span key={k} className="bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 text-xs font-black tracking-tight text-[var(--fbst-text-primary)]">
                                <span className="text-[var(--fbst-text-muted)] opacity-40 uppercase text-[9px] tracking-widest mr-2">{k}</span>
                                {String(v)}
                            </span>
                        ))}
                    </div>
                );
            } catch { return <span className="text-[var(--fbst-text-primary)] font-bold">{val}</span>; }
        }
        return <div className="text-xl font-black text-[var(--fbst-text-primary)] tracking-tight">{val}<span className="text-[var(--fbst-accent)] ml-1 opacity-60">{config.suffix}</span></div>;
    }

    // Edit inputs
    if (config.type === 'select') {
        return (
            <select 
                value={val} 
                onChange={e => onChange(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500"
            >
                {config.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        );
    }

    if (config.type === 'slider') {
        return (
            <div className="flex items-center gap-4">
                <input 
                    type="range" 
                    min={config.min} 
                    max={config.max} 
                    step={config.step ?? 1} 
                    value={val} 
                    onChange={e => onChange(e.target.value)}
                    className="flex-1 accent-blue-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
                <span className="w-8 text-right font-mono text-white">{val}</span>
            </div>
        );
    }

    if (config.type === 'number') {
        return (
            <div className="relative">
                <input 
                    type="number" 
                    min={config.min}
                    max={config.max}
                    value={val}
                    onChange={e => onChange(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500 pr-8"
                />
                {config.suffix && <span className="absolute right-3 top-2 text-slate-500">{config.suffix}</span>}
            </div>
        );
    }

    if (config.type === 'checkbox_list') {
        let current: string[] = [];
        try { current = JSON.parse(val); } catch {}
        if (!Array.isArray(current)) current = [];

        const toggle = (item: string) => {
            const next = current.includes(item) ? current.filter(x => x !== item) : [...current, item];
            onChange(JSON.stringify(next));
        };

        return (
            <div className="flex flex-wrap gap-2">
                {config.listOptions?.map(opt => (
                    <button 
                        key={opt}
                        onClick={() => toggle(opt)}
                        className={`px-3 py-1 rounded text-xs font-semibold border transition-colors ${
                            current.includes(opt) 
                                ? "bg-blue-600 border-blue-500 text-white" 
                                : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
                        }`}
                    >
                        {opt}
                    </button>
                ))}
            </div>
        );
    }

    if (config.type === 'json_object_counts') {
        let current: Record<string, number> = {};
        try { current = JSON.parse(val); } catch {}
        
        const updateCount = (key: string, count: number) => {
            const next = { ...current, [key]: count };
            if (count === 0) delete next[key]; // optional: remove if 0? Or keep 0.
            onChange(JSON.stringify(next));
        };

        return (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {config.listOptions?.map(opt => (
                    <div key={opt} className="bg-slate-800 p-2 rounded border border-slate-700 flex flex-col items-center">
                        <span className="text-xs text-slate-400 font-bold mb-1">{opt}</span>
                        <input 
                            type="number" 
                            min="0" 
                            value={current[opt] || 0} 
                            onChange={e => updateCount(opt, Number(e.target.value))}
                            className="w-full bg-slate-900 text-center text-white text-sm rounded py-1 border border-slate-700 focus:border-blue-500"
                        />
                    </div>
                ))}
            </div>
        );
    }

    // Default text
    return (
        <input 
            type="text" 
            value={val} 
            onChange={e => onChange(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500"
        />
    );
}
