// client/src/pages/Season.tsx
import { useEffect, useState } from "react";
import { getTeams, getPlayers } from "../lib/api";

type Team = {
  id: number;
  name: string;
  owner: string | null;
  budget: number;
  leagueId: number;
};

type PlayerSeasonRow = {
  mlb_id: string | null;
  team: string | null;
  R: number | null;
  HR: number | null;
  RBI: number | null;
  SB: number | null;
  W: number | null;
  S: number | null;
  K: number | null;
};

type SeasonTotals = {
  R: number;
  HR: number;
  RBI: number;
  SB: number;
  W: number;
  S: number;
  K: number;
};

type SeasonPoints = {
  R: number;
  HR: number;
  RBI: number;
  SB: number;
  W: number;
  S: number;
  K: number;
  total: number;
};

type SeasonRow = {
  teamId: number;
  teamName: string;
  owner: string | null;
  totals: SeasonTotals;
  points: SeasonPoints;
};

function safeNum(value: number | null | undefined): number {
  return typeof value === "number" && !Number.isNaN(value) ? value : 0;
}

/**
 * Standard roto scoring:
 * - More is better for every category here.
 * - Best team in a category gets N points, worst gets 1.
 * - Ties share the average of the occupied point slots.
 */
function applyRotoScoring(rows: SeasonRow[]) {
  const n = rows.length;
  if (n === 0) return;

  const catKeys: (keyof SeasonTotals)[] = [
    "R",
    "HR",
    "RBI",
    "SB",
    "W",
    "S",
    "K",
  ];

  // reset points
  for (const row of rows) {
    row.points = {
      R: 0,
      HR: 0,
      RBI: 0,
      SB: 0,
      W: 0,
      S: 0,
      K: 0,
      total: 0,
    };
  }

  for (const key of catKeys) {
    const entries = rows
      .map((row, index) => ({
        index,
        value: row.totals[key],
      }))
      .sort((a, b) => b.value - a.value); // higher is better

    let i = 0;
    while (i < n) {
      let j = i + 1;
      // group with same value
      while (j < n && entries[j].value === entries[i].value) {
        j++;
      }
      const groupSize = j - i;
      const bestRank = i + 1;
      const worstRank = j;

      // sum points for ranks [bestRank, worstRank]
      let sumPoints = 0;
      for (let rank = bestRank; rank <= worstRank; rank++) {
        sumPoints += n - rank + 1;
      }
      const avgPoints = sumPoints / groupSize;

      for (let k = i; k < j; k++) {
        const rowIndex = entries[k].index;
        rows[rowIndex].points[key] = avgPoints;
      }

      i = j;
    }
  }

  // total points per team
  for (const row of rows) {
    row.points.total =
      row.points.R +
      row.points.HR +
      row.points.RBI +
      row.points.SB +
      row.points.W +
      row.points.S +
      row.points.K;
  }

  // sort standings by total points, desc
  rows.sort((a, b) => b.points.total - a.points.total);
}

export default function SeasonPage() {
  const [rows, setRows] = useState<SeasonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [teams, players] = await Promise.all([
          getTeams(),
          getPlayers(),
        ]);

        const byTeamId: Record<number, SeasonRow> = {};
        for (const t of teams as Team[]) {
          byTeamId[t.id] = {
            teamId: t.id,
            teamName: t.name,
            owner: t.owner,
            totals: {
              R: 0,
              HR: 0,
              RBI: 0,
              SB: 0,
              W: 0,
              S: 0,
              K: 0,
            },
            points: {
              R: 0,
              HR: 0,
              RBI: 0,
              SB: 0,
              W: 0,
              S: 0,
              K: 0,
              total: 0,
            },
          };
        }

        const norm = (s: string | null | undefined) =>
          (s ?? "").trim().toLowerCase();

        for (const p of players as PlayerSeasonRow[]) {
          const playerTeamName = norm(p.team);
          if (!playerTeamName) continue;

          const team = (teams as Team[]).find(
            (t) => norm(t.name) === playerTeamName
          );
          if (!team) continue;

          const row = byTeamId[team.id];
          if (!row) continue;

          row.totals.R += safeNum(p.R);
          row.totals.HR += safeNum(p.HR);
          row.totals.RBI += safeNum(p.RBI);
          row.totals.SB += safeNum(p.SB);
          row.totals.W += safeNum(p.W);
          row.totals.S += safeNum(p.S);
          row.totals.K += safeNum(p.K);
        }

        const rowsArr = Object.values(byTeamId);

        // Apply roto scoring on the derived totals
        applyRotoScoring(rowsArr);

        setRows(rowsArr);
      } catch (err) {
        console.error("Failed to load season standings", err);
        setError("Failed to load season standings");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <>
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Season Standings</h1>
        <p className="text-xs text-slate-400">
          7×7 roto-style points (higher is better).
        </p>
      </header>

      {error && (
        <div className="mb-4 text-red-400 text-sm bg-red-950/40 border border-red-700 px-3 py-2 rounded">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-slate-300 text-center">
          Loading season standings…
        </div>
      ) : (
        <div className="max-w-5xl mx-auto overflow-x-auto border border-slate-800 rounded-xl">
          <table className="min-w-full text-sm border-collapse">
            <thead className="bg-slate-900">
              <tr>
                <th className="border border-slate-800 px-3 py-2 text-left">
                  #
                </th>
                <th className="border border-slate-800 px-3 py-2 text-left">
                  Team
                </th>
                <th className="border border-slate-800 px-3 py-2 text-left">
                  Owner
                </th>
                <th className="border border-slate-800 px-3 py-2 text-right">
                  R
                </th>
                <th className="border border-slate-800 px-3 py-2 text-right">
                  HR
                </th>
                <th className="border border-slate-800 px-3 py-2 text-right">
                  RBI
                </th>
                <th className="border border-slate-800 px-3 py-2 text-right">
                  SB
                </th>
                <th className="border border-slate-800 px-3 py-2 text-right">
                  W
                </th>
                <th className="border border-slate-800 px-3 py-2 text-right">
                  S
                </th>
                <th className="border border-slate-800 px-3 py-2 text-right">
                  K
                </th>
                <th className="border border-slate-800 px-3 py-2 text-right">
                  Pts
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.teamId} className="odd:bg-slate-950">
                  <td className="border border-slate-800 px-3 py-2 text-right">
                    {idx + 1}
                  </td>
                  <td className="border border-slate-800 px-3 py-2">
                    {row.teamName}
                  </td>
                  <td className="border border-slate-800 px-3 py-2">
                    {row.owner ?? "—"}
                  </td>
                  <td className="border border-slate-800 px-3 py-2 text-right">
                    {row.totals.R}
                  </td>
                  <td className="border border-slate-800 px-3 py-2 text-right">
                    {row.totals.HR}
                  </td>
                  <td className="border border-slate-800 px-3 py-2 text-right">
                    {row.totals.RBI}
                  </td>
                  <td className="border border-slate-800 px-3 py-2 text-right">
                    {row.totals.SB}
                  </td>
                  <td className="border border-slate-800 px-3 py-2 text-right">
                    {row.totals.W}
                  </td>
                  <td className="border border-slate-800 px-3 py-2 text-right">
                    {row.totals.S}
                  </td>
                  <td className="border border-slate-800 px-3 py-2 text-right">
                    {row.totals.K}
                  </td>
                  <td className="border border-slate-800 px-3 py-2 text-right font-semibold">
                    {row.points.total.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
