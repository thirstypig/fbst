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
} from "../api";

type Props = {
  player: PlayerSeasonStat | null;
  onClose: () => void;
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
 * Layout tweaks:
 * - slightly tighter modal padding
 * - slightly tighter section padding
 * - table headers centered (except first label column)
 * - table body cells centered (except first label column)
 */
const overlayCls =
  "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3";

const modalCls =
  "w-full max-w-4xl rounded-2xl bg-neutral-950 text-neutral-100 shadow-2xl border border-white/10";

const headerCls =
  "flex items-start justify-between gap-3 px-4 py-3 border-b border-white/10";

const bodyCls = "px-4 py-3";

const tabWrapCls = "flex gap-2";
const tabBtnBase =
  "px-3 py-1.5 rounded-lg text-sm border border-white/10 hover:border-white/20";
const tabBtnActive = "bg-white/10";

const sectionCls = "rounded-2xl border border-white/10 bg-white/5";

// tighter than before
const sectionHeadCls =
  "px-3 py-2 border-b border-white/10 flex items-center justify-between";
const sectionTitleCls = "text-sm font-semibold text-neutral-100";
const sectionBodyCls = "p-2";

// keep compact + legible
const tableCls = "w-full border-collapse text-xs leading-tight tabular-nums";

// NEW: header/cell alignment variants
const thBaseCls =
  "font-semibold text-neutral-200 border-b border-white/10 px-2 py-1 whitespace-nowrap";
const thLeftCls = `${thBaseCls} text-left`;
const thCenterCls = `${thBaseCls} text-center`;

const tdBaseCls =
  "text-neutral-100 border-b border-white/5 px-2 py-1 whitespace-nowrap";
const tdLeftCls = `${tdBaseCls} text-left`;
const tdCenterCls = `${tdBaseCls} text-center`;
const tdMutedCls = "text-neutral-300";

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-sm border border-white/10 hover:border-white/20"
      aria-label="Close"
    >
      Close
    </button>
  );
}

export default function PlayerDetailModal({ player, onClose }: Props) {
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

  // Reset on player change
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

  // Escape-to-close
  useEffect(() => {
    if (!player) return;
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [player, onClose]);

  if (!player) return null;

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
      <div className={modalCls}>
        <div className={headerCls}>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2 className="text-lg font-semibold leading-tight truncate">
                {title}
              </h2>
              <span className="text-xs text-neutral-300">{roleLabel}</span>
            </div>

            <div className="mt-1 text-xs text-neutral-300 flex flex-wrap gap-x-3 gap-y-1">
              {pos ? <span>POS: {pos}</span> : null}
              {ogba ? <span>OGBA: {ogba}</span> : null}
              {mlbTeam ? <span>MLB: {mlbTeam}</span> : null}
              {mlbId ? <span className="opacity-80">ID: {mlbId}</span> : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={tabWrapCls}>
              <button
                className={`${tabBtnBase} ${tab === "stats" ? tabBtnActive : ""}`}
                onClick={() => setTab("stats")}
              >
                Stats
              </button>
              <button
                className={`${tabBtnBase} ${tab === "profile" ? tabBtnActive : ""}`}
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
            <div className="mb-3 rounded-xl border border-red-500/30 bg-red-950/30 px-3 py-2 text-sm text-red-200">
              {err}
            </div>
          ) : null}

          {loading ? (
            <div className="text-sm text-neutral-300">Loading…</div>
          ) : tab === "profile" ? (
            <div className={sectionCls}>
              <div className={sectionHeadCls}>
                <div className={sectionTitleCls}>Profile</div>
              </div>
              <div className={sectionBodyCls}>
                {profile ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <div className="text-xs text-neutral-400">Name</div>
                      <div className="text-sm">{profile.fullName}</div>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-400">Team</div>
                      <div className="text-sm">{profile.currentTeam ?? "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-400">Primary</div>
                      <div className="text-sm">{profile.primaryPosition ?? "—"}</div>
                    </div>

                    <div>
                      <div className="text-xs text-neutral-400">B/T</div>
                      <div className="text-sm">
                        {(profile.bats ?? "—")}/{(profile.throws ?? "—")}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-400">HT/WT</div>
                      <div className="text-sm">
                        {(profile.height ?? "—")} / {(profile.weight ?? "—")}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-400">Born</div>
                      <div className="text-sm">{profile.birthDate ?? "—"}</div>
                    </div>

                    <div>
                      <div className="text-xs text-neutral-400">Debut</div>
                      <div className="text-sm">{profile.mlbDebutDate ?? "—"}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-neutral-300">No profile data.</div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {/* Recent */}
              <div className={sectionCls}>
                <div className={sectionHeadCls}>
                  <div className={sectionTitleCls}>Recent (7 / 14 / 21 days) + YTD</div>
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
                    <div className="text-sm text-neutral-300">No recent rows.</div>
                  )}
                </div>
              </div>

              {/* Career */}
              <div className={sectionCls}>
                <div className={sectionHeadCls}>
                  <div className={sectionTitleCls}>Career (fantasy columns)</div>
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
                    <div className="text-sm text-neutral-300">No career rows.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-3 text-[11px] text-neutral-400">
            Tip: press <span className="text-neutral-200">Esc</span> to close.
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
      <table className={tableCls}>
        <thead>
          <tr>
            {/* Label column */}
            <th className={thLeftCls}></th>
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
            <tr key={x.label}>
              <td className={`${tdLeftCls} ${tdMutedCls}`}>{x.label}</td>
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
    );
  }

  const p = rows as RecentPitchingRow[];
  return (
    <table className={tableCls}>
      <thead>
        <tr>
          {/* Label column */}
          <th className={thLeftCls}></th>
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
          <tr key={x.label}>
            <td className={`${tdLeftCls} ${tdMutedCls}`}>{x.label}</td>
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
            <tr key={`${x.year}-${x.tm}`}>
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
    );
  }

  const p = rows as CareerPitchingRow[];
  return (
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
          // keep parsing for future; not currently displayed
          const _ip = parseIp((x as any).IP);
          void _ip;

          const era = norm((x as any).ERA) ? String((x as any).ERA) : fmt2(0);
          const whip = norm((x as any).WHIP) ? String((x as any).WHIP) : fmt2(0);

          return (
            <tr key={`${x.year}-${x.tm}`}>
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
  );
}
