import React from "react";
import { Link } from "react-router-dom";
import { getPrimaryPosition } from "../lib/baseballUtils";
import { fmtRate } from "../api/base";

/**
 * SHARED TYPES
 */

export type CategoryId = string;

export interface TeamPeriodCategoryPoints {
  categoryId: CategoryId;
  points: number;
}

export interface TeamPeriodSummaryRow {
  teamId: string;
  teamName: string;
  gamesPlayed: number;
  categories: TeamPeriodCategoryPoints[];
  totalPoints: number;
  totalPointsDelta: number; // vs previous day
}

export interface PeriodSummaryTableProps {
  periodId: string;
  rows: TeamPeriodSummaryRow[];
  categories: CategoryId[];
}

export interface CategoryPeriodRow {
  teamId: string;
  teamName: string;
  periodStat: number; // raw stat (AVG/ERA already calculated)
  points: number;
  pointsDelta: number; // vs previous day for this category
}

export interface CategoryPeriodTableProps {
  periodId: string;
  categoryId: CategoryId;
  rows: CategoryPeriodRow[];
}

export interface PeriodMeta {
  periodId: string;
  label: string; // e.g. "April 20"
  meetingDate: string; // 'YYYY-MM-DD'
}

export interface TeamSeasonRow {
  teamId: string;
  teamName: string;
  periodPoints: Record<string, number>; // key = periodId
  seasonTotalPoints: number;
}

export interface SeasonTableProps {
  periods: PeriodMeta[];
  rows: TeamSeasonRow[];
}

export interface TeamSeasonSummary {
  teamId: string;
  teamName: string;
  periodPoints: { periodId: string; points: number }[];
  seasonTotalPoints: number;
}

export interface TeamSeasonSummaryProps {
  summary: TeamSeasonSummary;
  periods: PeriodMeta[];
}

/**
 * TEAM PERIOD HITTERS
 */

export interface HitterPeriodStats {
  playerId: string;
  playerName: string;
  mlbTeam: string; // 3-letter code preferred
  positions: string[]; // e.g. ['1B', 'OF']

  gDH: number;
  gC: number;
  g1B: number;
  g2B: number;
  g3B: number;
  gSS: number;
  gOF: number;

  ab: number;
  runs: number;
  hits: number;
  hr: number;
  rbi: number;
  sb: number;
  bb: number;
  gs: number; // grand slams

  avg: number; // AVG for the period
}

export interface TeamPeriodHittersProps {
  periodId: string;
  teamId: string;
  hitters: HitterPeriodStats[];
}

/**
 * TEAM PERIOD PITCHERS
 */

export interface PitcherPeriodStats {
  playerId: string;
  playerName: string;
  mlbTeam: string;
  role: "SP" | "RP" | "P";

  g: number;
  gs: number;
  soShutouts: number;

  ip: number;
  h: number;
  er: number;
  bb: number;
  k: number;
  w: number;
  l: number;
  sv: number;
  bs: number;

  era: number;
  whip: number;
}

export interface TeamPeriodPitchersProps {
  periodId: string;
  teamId: string;
  pitchers: PitcherPeriodStats[];
}

/**
 * HELPERS
 */

const formatNumber = (value: number, decimals = 2): string => {
  if (!Number.isFinite(value)) return "-";
  return value.toFixed(decimals);
};

const formatSigned = (value: number, decimals = 1): string => {
  if (!Number.isFinite(value) || value === 0) return "0.0";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}`;
};

// For category tables: ints for counting stats, decimals only for AVG/ERA
const formatStatForCategory = (categoryId: string, value: number): string => {
  if (!Number.isFinite(value)) return "-";
  const id = categoryId.toUpperCase();

  if (id === "AVG") return fmtRate(value);
  if (id === "ERA") return value.toFixed(2);

  return Math.round(value).toString();
};

/**
 * PERIOD SUMMARY TABLE
 * Teams × Categories + GP + Total Points + +/- Total
 */

export const PeriodSummaryTable: React.FC<PeriodSummaryTableProps> = ({
  periodId,
  rows,
  categories,
}) => {
  const sortedRows = [...rows].sort((a, b) => b.totalPoints - a.totalPoints);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Period Summary – {periodId}</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left border-b border-slate-700">
                Team
              </th>
              <th className="px-2 py-1 text-center border-b border-slate-700">
                GP
              </th>
              {categories.map((cat) => (
                <th
                  key={cat}
                  className="px-2 py-1 text-center border-b border-slate-700"
                >
                  {cat}
                </th>
              ))}
              <th className="px-2 py-1 text-center border-b border-slate-700">
                Total Pts
              </th>
              <th className="px-2 py-1 text-center border-b border-slate-700">
                +/−
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const catMap = new Map(
                row.categories.map((c) => [c.categoryId, c.points])
              );

              return (
                <tr key={row.teamId}>
                  <td className="px-2 py-1 border-t border-slate-800">
                    <Link to={`/teams/${row.teamId}`} className="hover:underline hover:text-blue-500 transition-colors">
                      {row.teamName}
                    </Link>
                  </td>
                  <td className="px-2 py-1 text-center border-t border-slate-800">
                    {row.gamesPlayed}
                  </td>
                  {categories.map((cat) => (
                    <td
                      key={cat}
                      className="px-2 py-1 text-center border-t border-slate-800"
                    >
                      {formatNumber(catMap.get(cat) ?? 0, 1)}
                    </td>
                  ))}
                  <td className="px-2 py-1 text-center border-t border-slate-800 font-semibold">
                    {formatNumber(row.totalPoints, 1)}
                  </td>
                  <td className="px-2 py-1 text-center border-t border-slate-800">
                    {formatSigned(row.totalPointsDelta, 1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * CATEGORY PERIOD TABLE
 * One table per category, sorted by points desc
 */

export const CategoryPeriodTable: React.FC<CategoryPeriodTableProps> = ({
  periodId,
  categoryId,
  rows,
}) => {
  const sortedRows = [...rows].sort((a, b) => b.points - a.points);

  return (
    <div className="mt-6">
      <h3 className="text-md font-semibold mb-2">
        {categoryId} – Period {periodId}
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left border-b border-slate-700">
                Team
              </th>
              <th className="px-2 py-1 text-center border-b border-slate-700">
                Stat
              </th>
              <th className="px-2 py-1 text-center border-b border-slate-700">
                Points
              </th>
              <th className="px-2 py-1 text-center border-b border-slate-700">
                +/−
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr key={row.teamId}>
                <td className="px-2 py-1 border-t border-slate-800">
                  <Link to={`/teams/${row.teamId}`} className="hover:underline hover:text-blue-500 transition-colors">
                    {row.teamName}
                  </Link>
                </td>
                <td className="px-2 py-1 text-center border-t border-slate-800">
                  {formatStatForCategory(categoryId, row.periodStat)}
                </td>
                <td className="px-2 py-1 text-center border-t border-slate-800 font-semibold">
                  {formatNumber(row.points, 1)}
                </td>
                <td className="px-2 py-1 text-center border-t border-slate-800">
                  {formatSigned(row.pointsDelta, 1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * SEASON TABLE
 * Teams × Periods + Season Total
 */

export const SeasonTable: React.FC<SeasonTableProps> = ({
  periods,
  rows,
}) => {
  const sortedRows = [...rows].sort(
    (a, b) => b.seasonTotalPoints - a.seasonTotalPoints
  );

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Season Standings</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left border-b border-slate-700">
                Team
              </th>
              {periods.map((p) => (
                <th
                  key={p.periodId}
                  className="px-2 py-1 text-center border-b border-slate-700"
                  title={p.meetingDate}
                >
                  {p.label}
                </th>
              ))}
              <th className="px-2 py-1 text-center border-b border-slate-700">
                Season Total
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr key={row.teamId}>
                <td className="px-2 py-1 border-t border-slate-800">
                  <Link to={`/teams/${row.teamId}`} className="hover:underline hover:text-blue-500 transition-colors">
                    {row.teamName}
                  </Link>
                </td>
                {periods.map((p) => (
                  <td
                    key={p.periodId}
                    className="px-2 py-1 text-center border-t border-slate-800"
                  >
                    {formatNumber(row.periodPoints[p.periodId] ?? 0, 1)}
                  </td>
                ))}
                <td className="px-2 py-1 text-center border-t border-slate-800 font-semibold">
                  {formatNumber(row.seasonTotalPoints, 1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * TEAM SEASON SUMMARY TABLE (bottom of Teams page)
 */

export const TeamSeasonSummaryTable: React.FC<TeamSeasonSummaryProps> = ({
  summary,
  periods,
}) => {
  const periodMap = new Map(
    summary.periodPoints.map((p) => [p.periodId, p.points])
  );

  return (
    <div className="mt-6">
      <h3 className="text-md font-semibold mb-2">
        Season Summary – {summary.teamName}
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left border-b border-slate-700">
                Period
              </th>
              <th className="px-2 py-1 text-center border-b border-slate-700">
                Points
              </th>
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <tr key={p.periodId}>
                <td className="px-2 py-1 border-t border-slate-800">
                  {p.label}
                </td>
                <td className="px-2 py-1 text-center border-t border-slate-800">
                  {formatNumber(periodMap.get(p.periodId) ?? 0, 1)}
                </td>
              </tr>
            ))}
            <tr>
              <td className="px-2 py-1 border-t border-slate-800 font-semibold">
                Season Total
              </td>
              <td className="px-2 py-1 text-center border-t border-slate-800 font-semibold">
                {formatNumber(summary.seasonTotalPoints, 1)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * TEAM PERIOD HITTERS TABLE
 * Player, Team, Pos, G, DH, C, 1B, 2B, 3B, SS, OF, R, HR, RBI, SB, AVG, GS
 */

export const TeamPeriodHittersTable: React.FC<TeamPeriodHittersProps> = ({
  periodId,
  teamId,
  hitters,
}) => {
  const totals = hitters.reduce(
    (acc, h) => {
      acc.gDH += h.gDH;
      acc.gC += h.gC;
      acc.g1B += h.g1B;
      acc.g2B += h.g2B;
      acc.g3B += h.g3B;
      acc.gSS += h.gSS;
      acc.gOF += h.gOF;

      acc.ab += h.ab;
      acc.runs += h.runs;
      acc.hits += h.hits;
      acc.hr += h.hr;
      acc.rbi += h.rbi;
      acc.sb += h.sb;
      acc.bb += h.bb;
      acc.gs += h.gs;

      return acc;
    },
    {
      gDH: 0,
      gC: 0,
      g1B: 0,
      g2B: 0,
      g3B: 0,
      gSS: 0,
      gOF: 0,
      ab: 0,
      runs: 0,
      hits: 0,
      hr: 0,
      rbi: 0,
      sb: 0,
      bb: 0,
      gs: 0,
    }
  );

  const teamGames =
    totals.gDH +
    totals.gC +
    totals.g1B +
    totals.g2B +
    totals.g3B +
    totals.gSS +
    totals.gOF;

  const teamAvg = totals.ab > 0 ? totals.hits / totals.ab : 0;

  return (
    <div className="mt-6">
      <h3 className="text-md font-semibold mb-2">
        Hitters – Period {periodId} (Team {teamId})
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="px-1 py-1 text-left border-b border-slate-700">
                Player
              </th>
              <th className="px-1 py-1 text-left border-b border-slate-700">
                Team
              </th>
              <th className="px-1 py-1 text-left border-b border-slate-700">
                Pos
              </th>

              <th className="px-1 py-1 text-center border-b border-slate-700">
                G
              </th>
              <th className="px-1 py-1 text-center border-b border-slate-700">
                DH
              </th>
              <th className="px-1 py-1 text-center border-b border-slate-700">
                C
              </th>
              <th className="px-1 py-1 text-center border-b border-slate-700">
                1B
              </th>
              <th className="px-1 py-1 text-center border-b border-slate-700">
                2B
              </th>
              <th className="px-1 py-1 text-center border-b border-slate-700">
                3B
              </th>
              <th className="px-1 py-1 text-center border-b border-slate-700">
                SS
              </th>
              <th className="px-1 py-1 text-center border-b border-slate-700">
                OF
              </th>

              <th className="px-1 py-1 text-center border-b border-slate-700">
                R
              </th>
              <th className="px-1 py-1 text-center border-b border-slate-700">
                HR
              </th>
              <th className="px-1 py-1 text-center border-b border-slate-700">
                RBI
              </th>
              <th className="px-1 py-1 text-center border-b border-slate-700">
                SB
              </th>
              <th className="px-1 py-1 text-center border-b border-slate-700">
                AVG
              </th>
              <th className="px-1 py-1 text-center border-b border-slate-700">
                GS
              </th>
            </tr>
          </thead>
          <tbody>
            {hitters.map((h) => {
              const gTotal =
                h.gDH + h.gC + h.g1B + h.g2B + h.g3B + h.gSS + h.gOF;

              return (
                <tr key={h.playerId}>
                  <td className="px-1 py-1 border-t border-slate-800">
                    {h.playerName}
                  </td>
                  <td className="px-1 py-1 border-t border-slate-800">
                    {h.mlbTeam}
                  </td>
                  <td className="px-1 py-1 border-t border-slate-800">
                    {getPrimaryPosition(h.positions.join(", "))}
                  </td>

                  <td className="px-1 py-1 text-center border-t border-slate-800">
                    {gTotal}
                  </td>
                  <td className="px-1 py-1 text-center border-t border-slate-800">
                    {h.gDH}
                  </td>
                  <td className="px-1 py-1 text-center border-t border-slate-800">
                    {h.gC}
                  </td>
                  <td className="px-1 py-1 text-center border-t border-slate-800">
                    {h.g1B}
                  </td>
                  <td className="px-1 py-1 text-center border-t border-slate-800">
                    {h.g2B}
                  </td>
                  <td className="px-1 py-1 text-center border-t border-slate-800">
                    {h.g3B}
                  </td>
                  <td className="px-1 py-1 text-center border-t border-slate-800">
                    {h.gSS}
                  </td>
                  <td className="px-1 py-1 text-center border-t border-slate-800">
                    {h.gOF}
                  </td>

                  <td className="px-1 py-1 text-center border-t border-slate-800">
                    {h.runs}
                  </td>
                  <td className="px-1 py-1 text-center border-t border-slate-800">
                    {h.hr}
                  </td>
                  <td className="px-1 py-1 text-center border-t border-slate-800">
                    {h.rbi}
                  </td>
                  <td className="px-1 py-1 text-center border-t border-slate-800">
                    {h.sb}
                  </td>
                  <td className="px-1 py-1 text-center border-t border-slate-800">
                    {fmtRate(h.avg)}
                  </td>
                  <td className="px-1 py-1 text-center border-t border-slate-800">
                    {h.gs}
                  </td>
                </tr>
              );
            })}

            {/* Totals row */}
            <tr>
              <td
                className="px-1 py-1 border-t border-slate-800 font-semibold"
                colSpan={3}
              >
                Totals
              </td>

              <td className="px-1 py-1 text-center border-t border-slate-800 font-semibold">
                {teamGames}
              </td>
              <td className="px-1 py-1 text-center border-t border-slate-800 font-semibold">
                {totals.gDH}
              </td>
              <td className="px-1 py-1 text-center border-t border-slate-800 font-semibold">
                {totals.gC}
              </td>
              <td className="px-1 py-1 text-center border-t border-slate-800 font-semibold">
                {totals.g1B}
              </td>
              <td className="px-1 py-1 text-center border-t border-slate-800 font-semibold">
                {totals.g2B}
              </td>
              <td className="px-1 py-1 text-center border-t border-slate-800 font-semibold">
                {totals.g3B}
              </td>
              <td className="px-1 py-1 text-center border-t border-slate-800 font-semibold">
                {totals.gSS}
              </td>
              <td className="px-1 py-1 text-center border-t border-slate-800 font-semibold">
                {totals.gOF}
              </td>

              <td className="px-1 py-1 text-center border-t border-slate-800 font-semibold">
                {totals.runs}
              </td>
              <td className="px-1 py-1 text-center border-t border-slate-800 font-semibold">
                {totals.hr}
              </td>
              <td className="px-1 py-1 text-center border-t border-slate-800 font-semibold">
                {totals.rbi}
              </td>
              <td className="px-1 py-1 text-center border-t border-slate-800 font-semibold">
                {totals.sb}
              </td>
              <td className="px-1 py-1 text-center border-t border-slate-800 font-semibold">
                {fmtRate(teamAvg)}
              </td>
              <td className="px-1 py-1 text-center border-t border-slate-800 font-semibold">
                {totals.gs}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * TEAM PERIOD PITCHERS TABLE
 * Player, Team, Role, G, W, S, K, ERA, WHIP, SO
 */

export const TeamPeriodPitchersTable: React.FC<TeamPeriodPitchersProps> = ({
  periodId,
  teamId,
  pitchers,
}) => {
  const totals = pitchers.reduce(
    (acc, p) => {
      acc.g += p.g;
      acc.gs += p.gs;
      acc.soShutouts += p.soShutouts;

      acc.ip += p.ip;
      acc.h += p.h;
      acc.er += p.er;
      acc.bb += p.bb;
      acc.k += p.k;
      acc.w += p.w;
      acc.l += p.l;
      acc.sv += p.sv;
      acc.bs += p.bs;

      return acc;
    },
    {
      g: 0,
      gs: 0,
      soShutouts: 0,
      ip: 0,
      h: 0,
      er: 0,
      bb: 0,
      k: 0,
      w: 0,
      l: 0,
      sv: 0,
      bs: 0,
    }
  );

  const totalERA = totals.ip > 0 ? (9 * totals.er) / totals.ip : 0;
  const totalWHIP =
    totals.ip > 0 ? (totals.bb + totals.h) / totals.ip : 0;

  return (
    <div className="mt-6">
      <h3 className="text-md font-semibold mb-2">
        Pitchers – Period {periodId} (Team {teamId})
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="px-1 py-1 text-left border-b border-slate-700">
                Player
              </th>
              <th className="px-1 py-1 text-left border-b border-slate-700">
                Team
              </th>
              <th className="px-1 py-1 text-left border-b border-slate-700">
                Role
              </th>

              <th className="px-1 py-1 text-center border-b border-slate-700">
                G
              </th>
              <th className="px-1 py-1 text-center border-b border-slate-700">
                W
              </th>
              <th className="px-1 py-1 text-center border-b border-slate-700">
                S
              </th>
              <th className="px-1 py-1 text-center border-b border-slate-700">
                K
              </th>
              <th className="px-1 py-1 text-center border-b border-slate-700">
                ERA
              </th>
              <th className="px-1 py-1 text-center border-b border-slate-700">
                WHIP
              </th>
              <th className="px-1 py-1 text-center border-b border-slate-700">
                SO
              </th>
            </tr>
          </thead>
          <tbody>
            {pitchers.map((p) => (
              <tr key={p.playerId}>
                <td className="px-1 py-1 border-t border-slate-800">
                  {p.playerName}
                </td>
                <td className="px-1 py-1 border-t border-slate-800">
                  {p.mlbTeam}
                </td>
                <td className="px-1 py-1 border-t border-slate-800">
                  {p.role}
                </td>

                <td className="px-1 py-1 text-center border-t border-slate-800">
                  {p.g}
                </td>
                <td className="px-1 py-1 text-center border-t border-slate-800">
                  {p.w}
                </td>
                <td className="px-1 py-1 text-center border-t border-slate-800">
                  {p.sv}
                </td>
                <td className="px-1 py-1 text-center border-t border-slate-800">
                  {p.k}
                </td>
                <td className="px-1 py-1 text-center border-t border-slate-800">
                  {formatNumber(p.era, 2)}
                </td>
                <td className="px-1 py-1 text-center border-t border-slate-800">
                  {formatNumber(p.whip, 2)}
                </td>
                <td className="px-1 py-1 text-center border-t border-slate-800">
                  {p.soShutouts}
                </td>
              </tr>
            ))}

            {/* Totals row */}
            <tr>
              <td
                className="px-1 py-1 border-t border-slate-800 font-semibold"
                colSpan={3}
              >
                Totals
              </td>

              <td className="px-1 py-1 text-center border-t border-slate-800 font-semibold">
                {totals.g}
              </td>
              <td className="px-1 py-1 text-center border-t border-slate-800 font-semibold">
                {totals.w}
              </td>
              <td className="px-1 py-1 text-center border-t border-slate-800 font-semibold">
                {totals.sv}
              </td>
              <td className="px-1 py-1 text-center border-t border-slate-800 font-semibold">
                {totals.k}
              </td>
              <td className="px-1 py-1 text-center border-t border-slate-800 font-semibold">
                {formatNumber(totalERA, 2)}
              </td>
              <td className="px-1 py-1 text-center border-t border-slate-800 font-semibold">
                {formatNumber(totalWHIP, 2)}
              </td>
              <td className="px-1 py-1 text-center border-t border-slate-800 font-semibold">
                {totals.soShutouts}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
