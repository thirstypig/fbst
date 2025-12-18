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
                <Td>{r.AB}</Td>
                <Td>{r.H}</Td>
                <Td>{r.R}</Td>
                <Td>{r.HR}</Td>
                <Td>{r.RBI}</Td>
                <Td>{r.SB}</Td>
                <Td className="tabular-nums">{r.AVG}</Td>
              </>
            ) : (
              <>
                <Td>{r.IP}</Td>
                <Td>{r.W}</Td>
                <Td>{r.SV}</Td>
                <Td>{r.K}</Td>
                <Td className="tabular-nums">{r.ERA}</Td>
                <Td className="tabular-nums">{r.WHIP}</Td>
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
      <table className="min-w-[760px] w-full border-separate border-spacing-0">
        <thead>
          <tr className="text-xs text-white/60">
            <Th w={80}>YR</Th>
            <Th>TM</Th>
            {group === "hitting" ? (
              <>
                <Th w={80}>R</Th>
                <Th w={80}>HR</Th>
                <Th w={80}>RBI</Th>
                <Th w={80}>SB</Th>
                <Th w={90}>AVG</Th>
              </>
            ) : (
              <>
                <Th w={80}>W</Th>
                <Th w={80}>SV</Th>
                <Th w={80}>K</Th>
                <Th w={90}>ERA</Th>
                <Th w={90}>WHIP</Th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any, idx) => {
            const isTotals = r.year === "TOT";
            return (
              <tr
                key={`${r.year}-${idx}`}
                className={clsx(
                  "border-t border-white/10 text-sm",
                  isTotals ? "bg-white/5 text-white" : "text-white/90"
                )}
              >
                <Td className={clsx("text-white/80", isTotals && "font-semibold")}>{r.year}</Td>
                <Td className={clsx("text-white/80", isTotals && "font-semibold")}>{r.tm}</Td>

                {group === "hitting" ? (
                  <>
                    <Td className="tabular-nums">{r.R}</Td>
                    <Td className="tabular-nums">{r.HR}</Td>
                    <Td className="tabular-nums">{r.RBI}</Td>
                    <Td className="tabular-nums">{r.SB}</Td>
                    <Td className="tabular-nums">{r.AVG}</Td>
                  </>
                ) : (
                  <>
                    <Td className="tabular-nums">{r.W}</Td>
                    <Td className="tabular-nums">{r.SV}</Td>
                    <Td className="tabular-nums">{r.K}</Td>
                    <Td className="tabular-nums">{r.ERA}</Td>
                    <Td className="tabular-nums">{r.WHIP}</Td>
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
