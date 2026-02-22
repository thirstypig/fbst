// client/src/pages/AuctionValues.tsx
import React, { useEffect, useMemo, useState } from "react";

import { getAuctionValues, type PlayerSeasonStat } from "../../../api";
import PlayerDetailModal from "../../players/components/PlayerDetailModal";

function norm(v: any) {
  return String(v ?? "").trim();
}

function playerName(p: PlayerSeasonStat) {
  return norm((p as any).player_name ?? (p as any).name);
}

function ogbaTeam(p: PlayerSeasonStat) {
  return norm((p as any).ogba_team_code ?? (p as any).team);
}

function posStr(p: PlayerSeasonStat) {
  return norm((p as any).positions ?? (p as any).pos);
}

function rowIsPitcher(p: PlayerSeasonStat) {
  const v = (p as any).is_pitcher;
  if (typeof v === "boolean") return v;
  const g = String((p as any).group ?? "").toUpperCase();
  if (g === "P") return true;
  if (g === "H") return false;
  return Boolean((p as any).isPitcher);
}

function toNum(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// Canonical “auction value” getter (handles multiple field names)
function getValue(p: PlayerSeasonStat): number {
  // prefer dollar_value then value
  const dv = (p as any).dollar_value ?? (p as any).dollarValue;
  const v = (p as any).value;
  const z = (p as any).z_total ?? (p as any).relValue;
  // We display “value” (dollars). z_total is not used for ranking here.
  return toNum(dv ?? v ?? 0);
}

function fmt1(v: number): string {
  return v.toFixed(1);
}

export default function AuctionValues() {
  const [rows, setRows] = useState<PlayerSeasonStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [group, setGroup] = useState<"hitters" | "pitchers">("hitters");
  const [query, setQuery] = useState<string>("");

  const [selected, setSelected] = useState<PlayerSeasonStat | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAuctionValues();
        if (!mounted) return;
        setRows(data ?? []);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? "Failed to load auction values.");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const wantPitchers = group === "pitchers";

    let out = (rows ?? []).filter((p) => (wantPitchers ? rowIsPitcher(p) : !rowIsPitcher(p)));

    if (q) {
      out = out.filter((p) => {
        const name = playerName(p).toLowerCase();
        const team = ogbaTeam(p).toLowerCase();
        const pos = posStr(p).toLowerCase();
        return name.includes(q) || team.includes(q) || pos.includes(q);
      });
    }

    // Sort by value desc, then name asc
    out.sort((a, b) => {
      const av = getValue(a);
      const bv = getValue(b);
      if (bv !== av) return bv - av;
      return playerName(a).localeCompare(playerName(b));
    });

    return out;
  }, [rows, group, query]);

  const maxValue = useMemo(() => {
    // numeric accumulator, always returns number
    return filtered.reduce<number>((max, r) => {
      const v = getValue(r);
      return v > max ? v : max;
    }, 0);
  }, [filtered]);

  return (
    <div className="px-10 py-8">
      <div className="mb-6 text-center">
        <div className="text-4xl font-semibold text-white">Auction Values</div>
        <div className="mt-2 text-sm text-white/60">
          Read-only display of auction values (engine is deferred).
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
        <div className="rounded-full bg-white/5 p-1">
          <button
            className={`rounded-full px-4 py-2 text-sm ${
              group === "hitters" ? "bg-sky-600/80 text-white" : "text-white/70 hover:bg-white/10"
            }`}
            onClick={() => setGroup("hitters")}
          >
            Hitters
          </button>
          <button
            className={`rounded-full px-4 py-2 text-sm ${
              group === "pitchers" ? "bg-sky-600/80 text-white" : "text-white/70 hover:bg-white/10"
            }`}
            onClick={() => setGroup("pitchers")}
          >
            Pitchers
          </button>
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search player / team / pos…"
          className="w-[320px] rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/40"
        />
      </div>

      <div className="mx-auto max-w-6xl overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
        <table className="min-w-[900px] w-full border-separate border-spacing-0">
          <thead>
            <tr className="text-xs text-white/60">
              <Th>PLAYER</Th>
              <Th w={90}>TEAM</Th>
              <Th w={110}>POS</Th>
              <Th w={110} className="text-right">
                VALUE
              </Th>
              <Th w={220}>REL</Th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-sm text-white/60" colSpan={5}>
                  Loading…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td className="px-4 py-6 text-sm text-red-300" colSpan={5}>
                  {error}
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-white/60" colSpan={5}>
                  No results.
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const value = getValue(p); // number
                const ratio = value > 0 && maxValue > 0 ? value / maxValue : 0;

                return (
                  <tr
                    key={(p as any).row_id ?? `${p.mlb_id}-${rowIsPitcher(p) ? "P" : "H"}`}
                    className="cursor-pointer text-sm text-white/90 hover:bg-white/5"
                    onClick={() => setSelected(p)}
                  >
                    <Td className="font-medium text-left">{playerName(p)}</Td>
                    <Td className="text-white/80">{ogbaTeam(p) || "FA"}</Td>
                    <Td className="text-white/80">{posStr(p) || (rowIsPitcher(p) ? "P" : "—")}</Td>
                    <Td className="tabular-nums text-right">{value > 0 ? fmt1(value) : "-"}</Td>
                    <Td>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-2 rounded-full bg-sky-500/80"
                          style={{ width: `${Math.round(ratio * 100)}%` }}
                        />
                      </div>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <PlayerDetailModal open={!!selected} player={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function Th({
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
      className={`border-b border-white/10 px-3 py-3 text-left font-medium ${className ?? ""}`}
    >
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`border-b border-white/10 px-3 py-3 ${className ?? ""}`}>{children}</td>;
}
