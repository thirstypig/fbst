import React, { useEffect, useMemo, useState } from "react";

import type {
  PlayerSeasonStat,
  PlayerProfile,
  CareerHittingRow,
  CareerPitchingRow,
  RecentHittingRow,
  RecentPitchingRow,
} from "../api";

import { getPlayerCareerStats, getPlayerRecentStats, getPlayerProfile } from "../api";

function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function getName(p: PlayerSeasonStat) {
  return p.player_name ?? p.name ?? "—";
}
function getMlbId(p: PlayerSeasonStat) {
  return p.mlb_id ?? (p as any).mlbId ?? "—";
}
function getOgbaTeam(p: PlayerSeasonStat) {
  return p.ogba_team_code ?? p.team ?? "—";
}
function getPos(p: PlayerSeasonStat) {
  return p.positions ?? p.pos ?? "—";
}
function getMlbTeam(p: PlayerSeasonStat) {
  return (p.mlbTeam ?? p.mlb_team ?? "").toString().trim();
}
function isPitcher(p: PlayerSeasonStat) {
  return Boolean(p.is_pitcher ?? p.isPitcher);
}

/**
 * TM (team) abbreviation helper for Career table:
 * - If TM is already "SEA", returns "SEA"
 * - If TM is "Toronto Blue Jays", returns "TOR"
 * - If TM is "TOT" or "—", returns as-is
 * - Also supports common MLB full names used by StatsAPI
 */
const TEAM_NAME_TO_ABBR: Record<string, string> = {
  "Arizona Diamondbacks": "ARI",
  "Atlanta Braves": "ATL",
  "Baltimore Orioles": "BAL",
  "Boston Red Sox": "BOS",
  "Chicago Cubs": "CHC",
  "Chicago White Sox": "CWS",
  "Cincinnati Reds": "CIN",
  "Cleveland Guardians": "CLE",
  "Colorado Rockies": "COL",
  "Detroit Tigers": "DET",
  "Houston Astros": "HOU",
  "Kansas City Royals": "KC",
  "Los Angeles Angels": "LAA",
  "Los Angeles Dodgers": "LAD",
  "Miami Marlins": "MIA",
  "Milwaukee Brewers": "MIL",
  "Minnesota Twins": "MIN",
  "New York Mets": "NYM",
  "New York Yankees": "NYY",
  "Oakland Athletics": "OAK",
  "Philadelphia Phillies": "PHI",
  "Pittsburgh Pirates": "PIT",
  "San Diego Padres": "SD",
  "San Francisco Giants": "SF",
  "Seattle Mariners": "SEA",
  "St. Louis Cardinals": "STL",
  "Tampa Bay Rays": "TB",
  "Texas Rangers": "TEX",
  "Toronto Blue Jays": "TOR",
  "Washington Nationals": "WSH",

  // A couple of common alternates people use:
  "Cleveland Indians": "CLE",
  "Tampa Bay Devil Rays": "TB",
  "Montreal Expos": "MON",
};

function tmAbbr(tm: any): string {
  const s = String(tm ?? "").trim();
  if (!s) return "—";

  const up = s.toUpperCase();

  // Preserve totals / blank marker
  if (up === "TOT") return "TOT";
  if (s === "—") return "—";

  // If it already looks like an abbreviation (2-4 letters), keep it.
  // (KC, SD, SEA, NYY, etc.)
  if (/^[A-Z]{2,4}$/.test(up) && !s.includes(" ")) return up;

  // Map full MLB team name -> abbreviation
  return TEAM_NAME_TO_ABBR[s] ?? s;
}

type Props = {
  open: boolean;
  onClose: () => void;
  player: PlayerSeasonStat | null;
};

export default function PlayerDetailModal({ open, onClose, player }: Props) {
  const [tab, setTab] = useState<"stats" | "profile">("stats");

  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [career, setCareer] = useState<Array<CareerHittingRow | CareerPitchingRow>>([]);
  const [recent, setRecent] = useState<Array<RecentHittingRow | RecentPitchingRow>>([]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const group = useMemo(() => {
    if (!player) return "hitting" as const;
    return isPitcher(player) ? ("pitching" as const) : ("hitting" as const);
  }, [player]);

  useEffect(() => {
    if (!open) return;
    if (!player) return;

    const mlbId = getMlbId(player);
    if (!mlbId || mlbId === "—") return;

    setTab("stats");
    setLoading(true);
    setErr(null);

    (async () => {
      try {
        const [prof, car, rec] = await Promise.all([
          getPlayerProfile(mlbId),
          getPlayerCareerStats(mlbId, group),
          getPlayerRecentStats(mlbId, group),
        ]);

        setProfile(prof);
        setCareer((car.rows as any) ?? []);
        setRecent((rec.rows as any) ?? []);
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load player details.");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, player, group]);

  if (!open || !player) return null;

  const headerName = getName(player);
  const headerPos = getPos(player);
  const headerOgba = getOgbaTeam(player);
  const headerMlb = getMlbTeam(player);
  const headerMlbId = getMlbId(player);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[1100px] max-w-[95vw] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-zinc-950/95 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-2xl font-semibold text-white">{headerName}</div>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/80">{headerPos}</span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/80">{headerOgba}</span>
              {headerMlb ? (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/80">{headerMlb}</span>
              ) : null}
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">
                MLB ID: {headerMlbId}
              </span>
            </div>
            <div className="mt-1 text-sm text-white/60">{isPitcher(player) ? "Pitcher detail" : "Hitter detail"}</div>
          </div>

          <button
            className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="flex items-center gap-2 px-6 pt-4">
          <button
            className={clsx(
              "rounded-xl px-4 py-2 text-sm",
              tab === "stats" ? "bg-white/15 text-white" : "bg-white/5 text-white/70 hover:bg-white/10"
            )}
            onClick={() => setTab("stats")}
          >
            Stats
          </button>
          <button
            className={clsx(
              "rounded-xl px-4 py-2 text-sm",
              tab === "profile" ? "bg-white/15 text-white" : "bg-white/5 text-white/70 hover:bg-white/10"
            )}
            onClick={() => setTab("profile")}
          >
            Profile
          </button>

          {loading ? <div className="ml-auto text-sm text-white/60">Loading…</div> : null}
          {err ? <div className="ml-auto text-sm text-red-300">{err}</div> : null}
        </div>

        <div className="p-6 pt-4">
          {tab === "stats" ? (
            <div className="space-y-4">
              <Section title="Recent (7 / 14 / 21 days)">
                <RecentTable group={group} rows={recent as any} />
              </Section>

              <Section title="Career (fantasy columns)">
                <CareerTable group={group} rows={career as any} />
              </Section>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                Projections are not available from MLB StatsAPI. If you want projections, we either (1) derive a simple
                “pace” projection, or (2) integrate a projections provider.
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Section title="Profile">
                <ProfilePanel profile={profile} />
              </Section>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                Player news is not available from MLB StatsAPI. If you want “last 4 months” news, we need a separate
                provider/feed (Fantrax, Rotowire, MLB RSS, etc.).
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <div className="text-sm font-semibold text-white/90">{title}</div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function RecentTable({
  group,
  rows,
}: {
  group: "hitting" | "pitching";
  rows: Array<RecentHittingRow | RecentPitchingRow>;
}) {
  if (!rows?.length) return <div className="text-sm text-white/60">No recent stats.</div>;

  return (
    <table className="w-full table-fixed border-separate border-spacing-0">
      <thead>
        <tr className="text-xs text-white/60">
          <Th w={80}>WIN</Th>
          {group === "hitting" ? (
            <>
              <Th>AB</Th>
              <Th>H</Th>
              <Th>R</Th>
              <Th>HR</Th>
              <Th>RBI</Th>
              <Th>SB</Th>
              <Th w={90}>AVG</Th>
            </>
          ) : (
            <>
              <Th>IP</Th>
              <Th>W</Th>
              <Th>SV</Th>
              <Th>K</Th>
              <Th w={90}>ERA</Th>
              <Th w={90}>WHIP</Th>
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {rows.map((r: any) => (
          <tr key={r.label} className="border-t border-white/10 text-sm text-white/90">
            <Td className="text-white/80">{r.label}</Td>
            {group === "hitting" ? (
              <>
                <Td className="text-right tabular-nums">{r.AB}</Td>
                <Td className="text-right tabular-nums">{r.H}</Td>
                <Td className="text-right tabular-nums">{r.R}</Td>
                <Td className="text-right tabular-nums">{r.HR}</Td>
                <Td className="text-right tabular-nums">{r.RBI}</Td>
                <Td className="text-right tabular-nums">{r.SB}</Td>
                <Td className="text-right tabular-nums">{r.AVG}</Td>
              </>
            ) : (
              <>
                <Td className="text-right tabular-nums">{r.IP}</Td>
                <Td className="text-right tabular-nums">{r.W}</Td>
                <Td className="text-right tabular-nums">{r.SV}</Td>
                <Td className="text-right tabular-nums">{r.K}</Td>
                <Td className="text-right tabular-nums">{r.ERA}</Td>
                <Td className="text-right tabular-nums">{r.WHIP}</Td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CareerTable({
  group,
  rows,
}: {
  group: "hitting" | "pitching";
  rows: Array<CareerHittingRow | CareerPitchingRow>;
}) {
  if (!rows?.length) return <div className="text-sm text-white/60">No career stats.</div>;

  // Rows already come oldest -> newest + totals at bottom (from api.ts).
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[760px] w-full border-separate border-spacing-0 text-xs">
        <thead>
          <tr className="text-[11px] text-white/60">
            <ThCompact w={70}>YR</ThCompact>
            <ThCompact w={60}>TM</ThCompact>
            {group === "hitting" ? (
              <>
                <ThCompact w={60} className="text-right">R</ThCompact>
                <ThCompact w={60} className="text-right">HR</ThCompact>
                <ThCompact w={60} className="text-right">RBI</ThCompact>
                <ThCompact w={60} className="text-right">SB</ThCompact>
                <ThCompact w={70} className="text-right">AVG</ThCompact>
              </>
            ) : (
              <>
                <ThCompact w={60} className="text-right">W</ThCompact>
                <ThCompact w={60} className="text-right">SV</ThCompact>
                <ThCompact w={60} className="text-right">K</ThCompact>
                <ThCompact w={70} className="text-right">ERA</ThCompact>
                <ThCompact w={70} className="text-right">WHIP</ThCompact>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any, idx) => {
            // Your API normalizes to { year, tm, ... } in client/api.ts
            const year = String(r.year ?? r.YR ?? "");
            const tm = String(r.tm ?? r.TM ?? "");

            const isTotals = year === "TOT";
            const tmShort = tmAbbr(tm);

            return (
              <tr
                key={`${year}-${idx}`}
                className={clsx(
                  "border-t border-white/10",
                  isTotals ? "bg-white/5 text-white" : "text-white/90"
                )}
              >
                <TdCompact className={clsx("text-white/80", isTotals && "font-semibold")}>
                  {year}
                </TdCompact>

                <TdCompact
                  className={clsx("text-white/80 whitespace-nowrap", isTotals && "font-semibold")}
                  title={tm && tm !== "TOT" && tm !== "—" ? tm : undefined}
                >
                  {tmShort}
                </TdCompact>

                {group === "hitting" ? (
                  <>
                    <TdCompact className="text-right tabular-nums">{r.R}</TdCompact>
                    <TdCompact className="text-right tabular-nums">{r.HR}</TdCompact>
                    <TdCompact className="text-right tabular-nums">{r.RBI}</TdCompact>
                    <TdCompact className="text-right tabular-nums">{r.SB}</TdCompact>
                    <TdCompact className="text-right tabular-nums">{r.AVG}</TdCompact>
                  </>
                ) : (
                  <>
                    <TdCompact className="text-right tabular-nums">{r.W}</TdCompact>
                    <TdCompact className="text-right tabular-nums">{r.SV}</TdCompact>
                    <TdCompact className="text-right tabular-nums">{r.K}</TdCompact>
                    <TdCompact className="text-right tabular-nums">{r.ERA}</TdCompact>
                    <TdCompact className="text-right tabular-nums">{r.WHIP}</TdCompact>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ProfilePanel({ profile }: { profile: PlayerProfile | null }) {
  if (!profile) return <div className="text-sm text-white/60">No profile data.</div>;

  const items: Array<[string, any]> = [
    ["Name", profile.fullName],
    ["Team", profile.currentTeam ?? "—"],
    ["Pos", profile.primaryPosition ?? "—"],
    ["B/T", `${profile.bats ?? "—"} / ${profile.throws ?? "—"}`],
    ["Ht/Wt", `${profile.height ?? "—"} / ${profile.weight ?? "—"}`],
    ["DOB", profile.birthDate ?? "—"],
    ["Debut", profile.mlbDebutDate ?? "—"],
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map(([k, v]) => (
        <div key={k} className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-xs text-white/60">{k}</div>
          <div className="text-sm text-white/90">{String(v)}</div>
        </div>
      ))}
    </div>
  );
}

function Th({ children, w }: { children: React.ReactNode; w?: number }) {
  return (
    <th
      style={w ? { width: w } : undefined}
      className="border-b border-white/10 bg-transparent px-3 py-2 text-left font-medium"
    >
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={clsx("border-b border-white/10 px-3 py-2", className)}>{children}</td>;
}

/**
 * Compact table primitives (Career table uses these)
 * - smaller padding
 * - smaller font
 * - better density in modal
 */
function ThCompact({
  children,
  w,
  className,
}: {
  children: React.ReactNode;
  w?: number;
  className?: string;
}) {
  return (
    <th
      style={w ? { width: w } : undefined}
      className={clsx(
        "border-b border-white/10 bg-transparent px-2 py-1 text-left font-medium",
        className
      )}
    >
      {children}
    </th>
  );
}

function TdCompact({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <td
      title={title}
      className={clsx("border-b border-white/10 px-2 py-1", className)}
    >
      {children}
    </td>
  );
}
