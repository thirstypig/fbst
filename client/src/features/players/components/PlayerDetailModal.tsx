// client/src/components/PlayerDetailModal.tsx
import React, { useEffect, useMemo, useState } from "react";

import {
  getPlayerCareerStats,
  getPlayerProfile,
  getPlayerRecentStats,
  type HOrP,
  type PlayerProfile,
  type PlayerSeasonStat,
  type CareerHittingRow,
  type CareerPitchingRow,
  type RecentHittingRow,
  type RecentPitchingRow,
} from "../../../api";

type Props = {
  player: PlayerSeasonStat | null;
  onClose: () => void;
  open?: boolean; // allows controlling visibility externally
};

type TabId = "stats" | "profile";

function norm(v: any) {
  return String(v ?? "").trim();
}

function isPitcherRow(p: PlayerSeasonStat): boolean {
  const v = (p as any).is_pitcher;
  if (typeof v === "boolean") return v;
  const g = norm((p as any).group).toUpperCase();
  if (g === "P") return true;
  if (g === "H") return false;
  return Boolean((p as any).isPitcher);
}

function toNum(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmt3(x: number): string {
  if (!Number.isFinite(x)) return "—";
  const s = x.toFixed(3);
  return s.startsWith("0") ? s.slice(1) : s;
}

function fmt2(x: number): string {
  if (!Number.isFinite(x)) return "—";
  return x.toFixed(2);
}

// keep for future use
function fmt1(x: number): string {
  if (!Number.isFinite(x)) return "—";
  return x.toFixed(1);
}

function parseIp(ip: any): number {
  const s = String(ip ?? "").trim();
  if (!s) return 0;
  const parts = s.split(".");
  const whole = Number(parts[0] ?? 0) || 0;
  const frac = Number(parts[1] ?? 0) || 0;
  if (frac === 1) return whole + 1 / 3;
  if (frac === 2) return whole + 2 / 3;
  const n = Number(s);
  return Number.isFinite(n) ? n : whole;
}

function deriveMode(p: PlayerSeasonStat): HOrP {
  return isPitcherRow(p) ? "pitching" : "hitting";
}

/**
 * Liquid Glass Styles for Modal
 */
const overlayCls =
  "fixed inset-0 z-50 bg-black/40 backdrop-blur-[4px] flex items-center justify-center p-4 animate-in fade-in duration-200";

const modalCls =
  "w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-[var(--lg-glass-bg)] backdrop-blur-[var(--lg-glass-blur)] rounded-[var(--lg-radius-2xl)] border border-[var(--lg-glass-border)] shadow-[var(--lg-glass-shadow)] animate-in zoom-in-95 duration-200";

const headerCls =
  "flex items-start justify-between gap-4 px-8 py-6 border-b border-[var(--lg-glass-border)] bg-white/5";

const bodyCls = "flex-1 overflow-y-auto px-8 py-6 custom-scrollbar";

const tabWrapCls = "flex gap-1 bg-white/5 p-1 rounded-[var(--lg-radius-lg)] border border-[var(--lg-glass-border)]";
const tabBtnBase =
  "px-4 py-1.5 rounded-[var(--lg-radius-md)] text-xs font-bold uppercase tracking-widest transition-all duration-200 transition-all";
const tabBtnActive = "bg-[var(--lg-accent)] text-white shadow-lg shadow-blue-500/20";
const tabBtnInactive = "text-[var(--lg-text-muted)] hover:text-[var(--lg-text-primary)] hover:bg-white/5";

const sectionCls = "rounded-[var(--lg-radius-xl)] border border-[var(--lg-glass-border)] bg-white/[0.02] overflow-hidden";
const sectionHeadCls =
  "px-6 py-4 border-b border-[var(--lg-glass-border)] bg-white/5 flex items-center justify-between";
const sectionTitleCls = "text-xs font-black uppercase tracking-[0.2em] text-[var(--lg-text-muted)]";
const sectionBodyCls = "p-0";

const tableCls = "w-full border-collapse text-xs tabular-nums";

const thBaseCls =
  "text-[10px] font-black uppercase tracking-widest text-[var(--lg-text-muted)] opacity-70 border-b border-[var(--lg-glass-border)] bg-white/5 px-4 py-3";
const thLeftCls = `${thBaseCls} text-left`;
const thCenterCls = `${thBaseCls} text-center`;

const tdBaseCls =
  "text-[var(--lg-text-primary)] border-b border-white/[0.02] px-4 py-3 font-bold";
const tdLeftCls = `${tdBaseCls} text-left`;
const tdCenterCls = `${tdBaseCls} text-center font-black`;
const tdMutedCls = "text-[var(--lg-text-muted)]";

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-[var(--lg-radius-lg)] text-[var(--lg-text-muted)] hover:text-[var(--lg-text-primary)] hover:bg-white/10 transition-colors"
      aria-label="Close"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

export default function PlayerDetailModal({ player, onClose, open }: Props) {
  const isVisible = open !== undefined ? open : !!player;
  
  const [tab, setTab] = useState<TabId>("stats");

  const mlbId = useMemo(() => norm(player?.mlb_id), [player]);
  const mode = useMemo(() => (player ? deriveMode(player) : "hitting"), [player]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [recentRows, setRecentRows] = useState<
    Array<RecentHittingRow | RecentPitchingRow>
  >([]);
  const [careerRows, setCareerRows] = useState<
    Array<CareerHittingRow | CareerPitchingRow>
  >([]);

  useEffect(() => {
    setTab("stats");
    setErr("");
    setProfile(null);
    setRecentRows([]);
    setCareerRows([]);
  }, [mlbId]);

  useEffect(() => {
    if (!player || !mlbId) return;

    let cancelled = false;
    setLoading(true);
    setErr("");

    (async () => {
      try {
        const [p, recent, career] = await Promise.all([
          getPlayerProfile(mlbId),
          getPlayerRecentStats(mlbId, mode),
          getPlayerCareerStats(mlbId, mode),
        ]);

        if (cancelled) return;

        setProfile(p);
        setRecentRows(recent.rows ?? []);
        setCareerRows(career.rows ?? []);
      } catch (e: any) {
        if (cancelled) return;
        setErr(String(e?.message ?? e ?? "Failed to load player details"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [player, mlbId, mode]);

  useEffect(() => {
    if (!player) return;
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [player, onClose]);

  if (!isVisible || !player) return null;

  const title = norm(player.player_name ?? (player as any).name ?? "Player");
  const pos = norm(player.positions ?? (player as any).pos ?? "");
  const ogba = norm(player.ogba_team_code ?? (player as any).team ?? "");
  const mlbTeam = norm((player as any).mlbTeam ?? (player as any).mlb_team_abbr ?? player.mlb_team ?? "");
  const roleLabel = mode === "pitching" ? "Pitching" : "Hitting";

  return (
    <div
      className={overlayCls}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className={modalCls} onMouseDown={e => e.stopPropagation()}>
        <div className={headerCls}>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <h2 className="text-3xl font-black tracking-tighter text-[var(--lg-text-heading)] leading-none truncate">
                {title}
              </h2>
              <span className={`px-2 py-0.5 rounded-[var(--lg-radius-sm)] text-[10px] font-black uppercase tracking-widest ${mode === 'pitching' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                {roleLabel}
              </span>
            </div>

            <div className="mt-3 text-[10px] font-black uppercase tracking-widest text-[var(--lg-text-muted)] flex flex-wrap gap-x-6 gap-y-1">
              {pos ? <div className="flex gap-2"><span>POS:</span> <span className="text-[var(--lg-text-primary)]">{pos}</span></div> : null}
              {ogba ? <div className="flex gap-2"><span>OGBA:</span> <span className="text-[var(--lg-text-primary)]">{ogba}</span></div> : null}
              {mlbTeam ? <div className="flex gap-2"><span>MLB:</span> <span className="text-[var(--lg-text-primary)]">{mlbTeam}</span></div> : null}
              {mlbId ? <div className="flex gap-2 opacity-60"><span>ID:</span> <span>{mlbId}</span></div> : null}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className={tabWrapCls}>
              <button
                className={`${tabBtnBase} ${tab === "stats" ? tabBtnActive : tabBtnInactive}`}
                onClick={() => setTab("stats")}
              >
                Stats
              </button>
              <button
                className={`${tabBtnBase} ${tab === "profile" ? tabBtnActive : tabBtnInactive}`}
                onClick={() => setTab("profile")}
              >
                Profile
              </button>
            </div>
            <CloseButton onClick={onClose} />
          </div>
        </div>

        <div className={bodyCls}>
          {err ? (
            <div className="lg-alert lg-alert-error mb-6">
              <div className="font-bold">Error:</div>
              <div>{err}</div>
            </div>
          ) : null}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-[var(--lg-text-muted)]">
              <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
              <div className="font-black uppercase tracking-widest text-[10px]">Synchronizing...</div>
            </div>
          ) : tab === "profile" ? (
            <div className={sectionCls}>
              <div className={sectionHeadCls}>
                <div className={sectionTitleCls}>Personnel Record</div>
              </div>
              <div className="p-8">
                {profile ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--lg-text-muted)] mb-1">Full Identity</div>
                      <div className="text-sm font-bold text-[var(--lg-text-primary)]">{profile.fullName}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--lg-text-muted)] mb-1">Assigned Unit</div>
                      <div className="text-sm font-bold text-[var(--lg-text-primary)]">{profile.currentTeam ?? "—"}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--lg-text-muted)] mb-1">Primary Role</div>
                      <div className="text-sm font-bold text-[var(--lg-text-primary)]">{profile.primaryPosition ?? "—"}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--lg-text-muted)] mb-1">B/T Spec</div>
                      <div className="text-sm font-bold text-[var(--lg-text-primary)]">
                        {(profile.bats ?? "—")}/{(profile.throws ?? "—")}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--lg-text-muted)] mb-1">HT/WT Specs</div>
                      <div className="text-sm font-bold text-[var(--lg-text-primary)]">
                        {(profile.height ?? "—")} / {(profile.weight ?? "—")}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--lg-text-muted)] mb-1">Origin Date</div>
                      <div className="text-sm font-bold text-[var(--lg-text-primary)]">{profile.birthDate ?? "—"}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--lg-text-muted)] mb-1">Field Entry</div>
                      <div className="text-sm font-bold text-[var(--lg-text-primary)]">{profile.mlbDebutDate ?? "—"}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-[var(--lg-text-muted)] italic">No personnel profile data found in registry.</div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8">
              {/* Recent */}
              <div className={sectionCls}>
                <div className={sectionHeadCls}>
                  <div className={sectionTitleCls}>Short-Term Velocity <span className="text-[var(--lg-accent)] opacity-40 mx-2">|</span> 7 / 14 / 21 Days + YTD</div>
                </div>
                <div className={sectionBodyCls}>
                  {recentRows.length ? (
                    <RecentTable
                      rows={recentRows}
                      mode={mode}
                      thLeftCls={thLeftCls}
                      thCenterCls={thCenterCls}
                      tdLeftCls={tdLeftCls}
                      tdCenterCls={tdCenterCls}
                      tdMutedCls={tdMutedCls}
                    />
                  ) : (
                    <div className="p-8 text-sm text-[var(--lg-text-muted)] italic">No recent performance logs located.</div>
                  )}
                </div>
              </div>

              {/* Career */}
              <div className={sectionCls}>
                <div className={sectionHeadCls}>
                  <div className={sectionTitleCls}>Historical Log <span className="text-[var(--lg-accent)] opacity-40 mx-2">|</span> Career Metrics</div>
                </div>
                <div className={sectionBodyCls}>
                  {careerRows.length ? (
                    <CareerTable
                      rows={careerRows}
                      mode={mode}
                      thLeftCls={thLeftCls}
                      thCenterCls={thCenterCls}
                      tdLeftCls={tdLeftCls}
                      tdCenterCls={tdCenterCls}
                      tdMutedCls={tdMutedCls}
                    />
                  ) : (
                    <div className="p-8 text-sm text-[var(--lg-text-muted)] italic">No historical career records found.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="px-8 py-4 border-t border-[var(--lg-glass-border)] bg-black/20 flex items-center justify-between">
           <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--lg-text-muted)] opacity-40">
            Press <span className="text-[var(--lg-text-primary)]">ESC</span> to eject
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--lg-text-muted)] opacity-40">
            FBST Protocol v2.5
          </div>
        </div>
      </div>
    </div>
  );
}

function RecentTable({
  rows,
  mode,
  thLeftCls,
  thCenterCls,
  tdLeftCls,
  tdCenterCls,
  tdMutedCls,
}: {
  rows: Array<RecentHittingRow | RecentPitchingRow>;
  mode: HOrP;
  thLeftCls: string;
  thCenterCls: string;
  tdLeftCls: string;
  tdCenterCls: string;
  tdMutedCls: string;
}) {
  if (mode === "hitting") {
    const r = rows as RecentHittingRow[];
    return (
      <div className="overflow-x-auto">
        <table className={tableCls}>
          <thead>
            <tr>
              <th className={thLeftCls}>Cycle</th>
              <th className={thCenterCls}>AB</th>
              <th className={thCenterCls}>H</th>
              <th className={thCenterCls}>R</th>
              <th className={thCenterCls}>HR</th>
              <th className={thCenterCls}>RBI</th>
              <th className={thCenterCls}>SB</th>
              <th className={thCenterCls}>AVG</th>
            </tr>
          </thead>
          <tbody>
            {r.map((x) => (
              <tr key={x.label} className="hover:bg-white/5 transition-colors">
                <td className={`${tdLeftCls} ${tdMutedCls} uppercase text-[10px] tracking-widest`}>{x.label}</td>
                <td className={tdCenterCls}>{toNum(x.AB)}</td>
                <td className={tdCenterCls}>{toNum(x.H)}</td>
                <td className={tdCenterCls}>{toNum(x.R)}</td>
                <td className={tdCenterCls}>{toNum(x.HR)}</td>
                <td className={tdCenterCls}>{toNum(x.RBI)}</td>
                <td className={tdCenterCls}>{toNum(x.SB)}</td>
                <td className={tdCenterCls}>
                  {x.AVG ?? fmt3(toNum(x.H) / Math.max(1, toNum(x.AB)))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const p = rows as RecentPitchingRow[];
  return (
    <div className="overflow-x-auto">
      <table className={tableCls}>
        <thead>
          <tr>
            <th className={thLeftCls}>Cycle</th>
            <th className={thCenterCls}>IP</th>
            <th className={thCenterCls}>W</th>
            <th className={thCenterCls}>SV</th>
            <th className={thCenterCls}>K</th>
            <th className={thCenterCls}>ERA</th>
            <th className={thCenterCls}>WHIP</th>
          </tr>
        </thead>
        <tbody>
          {p.map((x) => (
            <tr key={x.label} className="hover:bg-white/5 transition-colors">
              <td className={`${tdLeftCls} ${tdMutedCls} uppercase text-[10px] tracking-widest`}>{x.label}</td>
              <td className={tdCenterCls}>{x.IP ?? 0}</td>
              <td className={tdCenterCls}>{toNum(x.W)}</td>
              <td className={tdCenterCls}>{toNum(x.SV)}</td>
              <td className={tdCenterCls}>{toNum(x.K)}</td>
              <td className={tdCenterCls}>{x.ERA ?? fmt2(0)}</td>
              <td className={tdCenterCls}>{x.WHIP ?? fmt2(0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CareerTable({
  rows,
  mode,
  thLeftCls,
  thCenterCls,
  tdLeftCls,
  tdCenterCls,
  tdMutedCls,
}: {
  rows: Array<CareerHittingRow | CareerPitchingRow>;
  mode: HOrP;
  thLeftCls: string;
  thCenterCls: string;
  tdLeftCls: string;
  tdCenterCls: string;
  tdMutedCls: string;
}) {
  if (mode === "hitting") {
    const r = rows as CareerHittingRow[];
    return (
      <div className="overflow-x-auto">
        <table className={tableCls}>
          <thead>
            <tr>
              <th className={thCenterCls}>YR</th>
              <th className={thLeftCls}>TM</th>
              <th className={thCenterCls}>R</th>
              <th className={thCenterCls}>HR</th>
              <th className={thCenterCls}>RBI</th>
              <th className={thCenterCls}>SB</th>
              <th className={thCenterCls}>AVG</th>
            </tr>
          </thead>
          <tbody>
            {r.map((x) => (
              <tr key={`${x.year}-${x.tm}`} className="hover:bg-white/5 transition-colors">
                <td className={`${tdCenterCls} ${tdMutedCls}`}>{x.year}</td>
                <td className={`${tdLeftCls} ${tdMutedCls}`}>{x.tm || "—"}</td>
                <td className={tdCenterCls}>{toNum(x.R)}</td>
                <td className={tdCenterCls}>{toNum(x.HR)}</td>
                <td className={tdCenterCls}>{toNum(x.RBI)}</td>
                <td className={tdCenterCls}>{toNum(x.SB)}</td>
                <td className={tdCenterCls}>
                  {x.AVG ?? fmt3(toNum(x.H) / Math.max(1, toNum(x.AB)))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const p = rows as CareerPitchingRow[];
  return (
    <div className="overflow-x-auto">
      <table className={tableCls}>
        <thead>
          <tr>
            <th className={thCenterCls}>YR</th>
            <th className={thLeftCls}>TM</th>
            <th className={thCenterCls}>W</th>
            <th className={thCenterCls}>SV</th>
            <th className={thCenterCls}>K</th>
            <th className={thCenterCls}>ERA</th>
            <th className={thCenterCls}>WHIP</th>
          </tr>
        </thead>
        <tbody>
          {p.map((x) => {
            const era = norm((x as any).ERA) ? String((x as any).ERA) : fmt2(0);
            const whip = norm((x as any).WHIP) ? String((x as any).WHIP) : fmt2(0);

            return (
              <tr key={`${x.year}-${x.tm}`} className="hover:bg-white/5 transition-colors">
                <td className={`${tdCenterCls} ${tdMutedCls}`}>{x.year}</td>
                <td className={`${tdLeftCls} ${tdMutedCls}`}>{x.tm || "—"}</td>
                <td className={tdCenterCls}>{toNum(x.W)}</td>
                <td className={tdCenterCls}>{toNum(x.SV)}</td>
                <td className={tdCenterCls}>{toNum((x as any).SO)}</td>
                <td className={tdCenterCls}>{era}</td>
                <td className={tdCenterCls}>{whip}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
