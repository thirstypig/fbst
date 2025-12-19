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

/**
 * MLB team name -> abbreviation
 * - also normalizes common short forms (Was, Phi, etc.)
 */
const MLB_TEAM_ABBR: Record<string, string> = {
  // AL East
  "baltimore orioles": "BAL",
  "boston red sox": "BOS",
  "new york yankees": "NYY",
  "tampa bay rays": "TB",
  "toronto blue jays": "TOR",
  // AL Central
  "chicago white sox": "CWS",
  "cleveland guardians": "CLE",
  "detroit tigers": "DET",
  "kansas city royals": "KC",
  "minnesota twins": "MIN",
  // AL West
  "houston astros": "HOU",
  "los angeles angels": "LAA",
  "oakland athletics": "OAK",
  "seattle mariners": "SEA",
  "texas rangers": "TEX",
  // NL East
  "atlanta braves": "ATL",
  "miami marlins": "MIA",
  "new york mets": "NYM",
  "philadelphia phillies": "PHI",
  "washington nationals": "WSH",
  // NL Central
  "chicago cubs": "CHC",
  "cincinnati reds": "CIN",
  "milwaukee brewers": "MIL",
  "pittsburgh pirates": "PIT",
  "st. louis cardinals": "STL",
  "st louis cardinals": "STL",
  // NL West
  "arizona diamondbacks": "ARI",
  "colorado rockies": "COL",
  "los angeles dodgers": "LAD",
  "san diego padres": "SD",
  "san francisco giants": "SF",

  // Common short codes you might see (passthrough/normalize)
  "was": "WSH",
  "wsh": "WSH",
  "phi": "PHI",
  "lad": "LAD",
  "nym": "NYM",
  "nyy": "NYY",
  "sd": "SD",
  "sf": "SF",
  "tb": "TB",
  "kc": "KC",
  "chc": "CHC",
  "chw": "CWS",
  "cws": "CWS",
};

function normalizeTeamAbbr(v: any): string {
  const raw = String(v ?? "").trim();
  if (!raw) return "";
  if (raw === "—") return "";
  if (raw.toUpperCase() === "TOT") return "TOT";

  // If already looks like an abbreviation, just normalize casing
  const simple = raw.replace(/\./g, "").trim();
  if (/^[A-Za-z]{2,3}$/.test(simple)) {
    const up = simple.toUpperCase();
    if (up === "WSH" || up === "WAS") return "WSH";
    if (up === "SDP" || up === "SD") return "SD";
    if (up === "SFG" || up === "SF") return "SF";
    if (up === "TBR" || up === "TB") return "TB";
    if (up === "KCR" || up === "KC") return "KC";
    if (up === "CHW" || up === "CWS") return "CWS";
    return up;
  }

  const key = raw.toLowerCase();
  return MLB_TEAM_ABBR[key] ?? raw;
}

function getName(p: PlayerSeasonStat) {
  return p.player_name ?? p.name ?? "—";
}
function getMlbId(p: PlayerSeasonStat) {
  // Still needed internally for API calls (profile/career/recent).
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

function toNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function fmtInt(v: any): string {
  const n = toNum(v);
  return n === null ? "—" : String(Math.trunc(n));
}

function fmt3(v: any): string {
  const n = toNum(v);
  if (n === null) return "—";
  return n.toFixed(3).replace(/^0\./, ".");
}

function fmt2(v: any): string {
  const n = toNum(v);
  if (n === null) return "—";
  return n.toFixed(2);
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
  const headerMlb = normalizeTeamAbbr(getMlbTeam(player) || profile?.currentTeam || "");

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[980px] max-w-[95vw] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-zinc-950/95 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-2xl font-semibold text-white">{headerName}</div>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/80">{headerPos}</span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/80">{headerOgba}</span>
              {headerMlb ? (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/80">{headerMlb}</span>
              ) : null}
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

        <div className="flex items-center gap-2 px-5 pt-3">
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

        <div className="p-5 pt-3">
          {tab === "stats" ? (
            <div className="space-y-4">
              <Section title="YTD + Last 7 (same cell)">
                <YtdPlusRecentRow group={group} player={player} recentRows={recent as any} />
              </Section>

              <Section title="Career (compact)">
                <CareerTable group={group} rows={career as any} />
              </Section>
            </div>
          ) : (
            <div className="space-y-4">
              <Section title="Profile">
                <ProfilePanel profile={profile} />
              </Section>
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
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <div className="text-sm font-semibold text-white/90">{title}</div>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function YtdPlusRecentRow({
  group,
  player,
  recentRows,
}: {
  group: "hitting" | "pitching";
  player: PlayerSeasonStat;
  recentRows: Array<RecentHittingRow | RecentPitchingRow>;
}) {
  const last7: any =
    (recentRows || []).find((r: any) => String(r.label || "").toLowerCase().includes("last 7")) ??
    (recentRows || [])[0] ??
    null;

  if (!last7) return <div className="text-sm text-white/60">No period stats yet.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[720px] w-full border-separate border-spacing-0 text-xs">
        <thead>
          <tr className="text-white/60">
            {group === "hitting" ? (
              <>
                <Th w={70}>AB</Th>
                <Th w={70}>H</Th>
                <Th w={70}>R</Th>
                <Th w={70}>HR</Th>
                <Th w={70}>RBI</Th>
                <Th w={70}>SB</Th>
                <Th w={80}>AVG</Th>
              </>
            ) : (
              <>
                <Th w={80}>IP</Th>
                <Th w={70}>W</Th>
                <Th w={70}>SV</Th>
                <Th w={70}>K</Th>
                <Th w={80}>ERA</Th>
                <Th w={80}>WHIP</Th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-white/10 text-white/90">
            {group === "hitting" ? (
              <>
                <Td>
                  <StatCell top={fmtInt((player as any).AB)} bottom={fmtInt((last7 as any).AB)} />
                </Td>
                <Td>
                  <StatCell top={fmtInt((player as any).H)} bottom={fmtInt((last7 as any).H)} />
                </Td>
                <Td>
                  <StatCell top={fmtInt((player as any).R)} bottom={fmtInt((last7 as any).R)} />
                </Td>
                <Td>
                  <StatCell top={fmtInt((player as any).HR)} bottom={fmtInt((last7 as any).HR)} />
                </Td>
                <Td>
                  <StatCell top={fmtInt((player as any).RBI)} bottom={fmtInt((last7 as any).RBI)} />
                </Td>
                <Td>
                  <StatCell top={fmtInt((player as any).SB)} bottom={fmtInt((last7 as any).SB)} />
                </Td>
                <Td>
                  <StatCell top={fmt3((player as any).AVG)} bottom={fmt3((last7 as any).AVG)} mono />
                </Td>
              </>
            ) : (
              <>
                <Td>
                  <StatCell top={String((player as any).IP ?? "—")} bottom={String((last7 as any).IP ?? "—")} mono />
                </Td>
                <Td>
                  <StatCell top={fmtInt((player as any).W)} bottom={fmtInt((last7 as any).W)} />
                </Td>
                <Td>
                  <StatCell top={fmtInt((player as any).SV)} bottom={fmtInt((last7 as any).SV)} />
                </Td>
                <Td>
                  <StatCell top={fmtInt((player as any).K)} bottom={fmtInt((last7 as any).K)} />
                </Td>
                <Td>
                  <StatCell top={fmt2((player as any).ERA)} bottom={fmt2((last7 as any).ERA)} mono />
                </Td>
                <Td>
                  <StatCell top={fmt2((player as any).WHIP)} bottom={fmt2((last7 as any).WHIP)} mono />
                </Td>
              </>
            )}
          </tr>
        </tbody>
      </table>

      <div className="mt-2 text-[11px] text-white/50">
        Top = YTD (season). Bottom = {String((last7 as any).label ?? "period")} (red).
      </div>
    </div>
  );
}

function StatCell({ top, bottom, mono }: { top: string; bottom: string; mono?: boolean }) {
  return (
    <div className={clsx("flex flex-col items-center justify-center leading-tight", mono && "tabular-nums")}>
      <div className="text-white/90">{top}</div>
      <div className="text-red-300">{bottom}</div>
    </div>
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

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[720px] w-full border-separate border-spacing-0 text-xs">
        <thead>
          <tr className="text-white/60">
            <Th w={70}>YR</Th>
            <Th w={70}>TM</Th>
            {group === "hitting" ? (
              <>
                <Th w={70}>R</Th>
                <Th w={70}>HR</Th>
                <Th w={70}>RBI</Th>
                <Th w={70}>SB</Th>
                <Th w={80}>AVG</Th>
              </>
            ) : (
              <>
                <Th w={70}>W</Th>
                <Th w={70}>SV</Th>
                <Th w={70}>K</Th>
                <Th w={80}>ERA</Th>
                <Th w={80}>WHIP</Th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any, idx) => {
            const isTotals = r.year === "TOT";
            const tm = normalizeTeamAbbr(r.tm);

            return (
              <tr
                key={`${r.year}-${idx}`}
                className={clsx("border-t border-white/10", isTotals ? "bg-white/5 text-white" : "text-white/90")}
              >
                <Td className={clsx(isTotals && "font-semibold")}>{r.year}</Td>
                <Td className={clsx(isTotals && "font-semibold")}>{tm || (isTotals ? "" : "—")}</Td>

                {group === "hitting" ? (
                  <>
                    <Td className="tabular-nums">{fmtInt(r.R)}</Td>
                    <Td className="tabular-nums">{fmtInt(r.HR)}</Td>
                    <Td className="tabular-nums">{fmtInt(r.RBI)}</Td>
                    <Td className="tabular-nums">{fmtInt(r.SB)}</Td>
                    <Td className="tabular-nums">{fmt3(r.AVG)}</Td>
                  </>
                ) : (
                  <>
                    <Td className="tabular-nums">{fmtInt(r.W)}</Td>
                    <Td className="tabular-nums">{fmtInt(r.SV)}</Td>
                    <Td className="tabular-nums">{fmtInt(r.K)}</Td>
                    <Td className="tabular-nums">{fmt2(r.ERA)}</Td>
                    <Td className="tabular-nums">{fmt2(r.WHIP)}</Td>
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
    ["Team", normalizeTeamAbbr(profile.currentTeam) || profile.currentTeam || "—"],
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

/**
 * Compact, centered table cells.
 * - Header + body are centered
 * - Tight padding
 */
function Th({ children, w }: { children: React.ReactNode; w?: number }) {
  return (
    <th
      style={w ? { width: w } : undefined}
      className="border-b border-white/10 bg-transparent px-2 py-1 text-center font-medium"
    >
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={clsx("border-b border-white/10 px-2 py-1 text-center", className)}>{children}</td>;
}
