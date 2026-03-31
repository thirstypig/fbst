/**
 * Digest service — builds context for AI league digest generation.
 * Follows the standingsService pattern: exported functions, no class.
 */
import { prisma } from "../../../db/prisma.js";
import { logger } from "../../../lib/logger.js";
import { getWeekKey } from "../../../lib/utils.js";

// ─── Types ───

/** Narrow type for AiInsight.data on league_digest rows. */
export interface DigestData {
  votes?: Record<string, string>;
  [key: string]: unknown;
}

/** Narrow type for League.rules JSON. */
interface LeagueRulesPartial {
  leagueType?: string;
  [key: string]: unknown;
}

/** Team data prepared for the AI prompt. */
export interface DigestTeamData {
  id: number;
  name: string;
  keyPlayers: string;
  keeperNames: string;
  recentMoves: string;
  overallRank: number | null;
  totalPoints: number | null;
  statsLine: string;
  categoryRankLine: string;
}

/** Full context needed to generate a digest. */
export interface DigestContext {
  leagueName: string;
  season: number;
  leagueType: string;
  teams: DigestTeamData[];
  tradeStyle: TradeStyle;
  weekNumber: number;
  previousVotes: { yes: number; no: number } | null;
  narrativeHints: string[];
}

/** Vote results for a digest. */
export interface VoteResults {
  yes: number;
  no: number;
  myVote: string | null;
}

// ─── Constants ───

const TRADE_STYLES = ["conservative", "outrageous", "fun"] as const;
type TradeStyle = typeof TRADE_STYLES[number];

// ─── Helpers ───

/** Ordinal suffix: 1→"st", 2→"nd", 3→"rd", else "th" */
function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return "th";
  return ["th", "st", "nd", "rd"][n % 10] ?? "th";
}

/** Extract vote counts from digest data for a specific user. */
export function extractVoteResults(data: unknown, userId: number): VoteResults {
  const d = (data ?? {}) as DigestData;
  const votes: Record<string, string> = d.votes || {};
  const yes = Object.values(votes).filter(v => v === "yes").length;
  const no = Object.values(votes).filter(v => v === "no").length;
  const myVote = votes[String(userId)] || null;
  return { yes, no, myVote };
}

// ─── Main Context Builder ───

/**
 * Build all context needed to generate a league digest.
 * Queries DB for league, teams, rosters, standings, and recent transactions.
 * Returns a DigestContext ready to pass to aiAnalysisService.generateLeagueDigest().
 */
export async function buildDigestContext(leagueId: number, weekKey: string): Promise<DigestContext | null> {
  const prevWeekKey = getWeekKey(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

  const [league, teams, prevDigest, activePeriod] = await Promise.all([
    prisma.league.findUnique({ where: { id: leagueId }, select: { name: true, season: true, rules: true } }),
    prisma.team.findMany({
      where: { leagueId },
      include: {
        rosters: {
          where: { releasedAt: null },
          include: { player: { select: { name: true, posPrimary: true } } },
          orderBy: { price: "desc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.aiInsight.findFirst({ where: { type: "league_digest", leagueId, weekKey: prevWeekKey } }),
    prisma.period.findFirst({ where: { leagueId, status: "ACTIVE" }, orderBy: { startDate: "desc" } }),
  ]);

  if (!league) return null;

  // Compute real standings if active period exists
  const { computeTeamStatsFromDb, computeStandingsFromStats, computeCategoryRows, CATEGORY_CONFIG } =
    await import("../../standings/services/standingsService.js");

  let standingsCtx: {
    standings: Awaited<ReturnType<typeof computeStandingsFromStats>>;
    categoryRanks: Record<number, Record<string, { value: number; rank: number }>>;
    teamStats: Awaited<ReturnType<typeof computeTeamStatsFromDb>>;
  } | null = null;

  if (activePeriod) {
    try {
      const teamStats = await computeTeamStatsFromDb(leagueId, activePeriod.id);
      const standings = computeStandingsFromStats(teamStats);
      const categoryRanks: Record<number, Record<string, { value: number; rank: number }>> = {};
      for (const t of teamStats) {
        categoryRanks[t.team.id] = {};
      }
      for (const cfg of CATEGORY_CONFIG) {
        const rows = computeCategoryRows(teamStats, cfg.key, cfg.lowerIsBetter);
        for (const r of rows) {
          if (categoryRanks[r.teamId]) {
            categoryRanks[r.teamId][cfg.key] = { value: r.value, rank: r.rank };
          }
        }
      }
      standingsCtx = { standings, categoryRanks, teamStats };
    } catch (err) {
      logger.warn({ error: String(err) }, "Could not compute standings for digest — proceeding without");
    }
  }

  // Recent transactions (last 14 days) per team
  const recentRosters = await prisma.roster.findMany({
    where: {
      teamId: { in: teams.map(t => t.id) },
      acquiredAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
      source: { not: "import" },
    },
    include: { player: { select: { name: true, posPrimary: true } }, team: { select: { name: true } } },
    orderBy: { acquiredAt: "desc" },
  });
  const movesByTeam = new Map<number, string[]>();
  for (const r of recentRosters) {
    const moves = movesByTeam.get(r.teamId) || [];
    moves.push(`${r.source}: ${r.player.name} (${r.player.posPrimary})`);
    movesByTeam.set(r.teamId, moves);
  }

  // Determine trade style rotation based on week number
  const weekNum = parseInt(weekKey.split("-W")[1]) || 0;
  const tradeStyle = TRADE_STYLES[weekNum % 3];

  // Identify keepers per team and build team data (NO auction prices)
  const { isKeeperRoster } = await import("../../../lib/sportConfig.js");
  const teamData: DigestTeamData[] = teams.map(t => {
    const keepers = t.rosters.filter(r => isKeeperRoster(r));
    const standingsRow = standingsCtx?.standings.find(s => s.teamId === t.id);
    const catRanks = standingsCtx?.categoryRanks[t.id];

    let statsLine = "";
    let categoryRankLine = "";
    if (catRanks) {
      const hitting = ["R", "HR", "RBI", "SB", "AVG"].map(k => {
        const c = catRanks[k];
        if (!c) return null;
        const val = k === "AVG" ? `.${Math.round(c.value * 1000)}` : String(Math.round(c.value));
        return `${k}:${val}(${c.rank}${ordinal(c.rank)})`;
      }).filter(Boolean).join(" ");
      const pitching = ["W", "S", "K", "ERA", "WHIP"].map(k => {
        const c = catRanks[k];
        if (!c) return null;
        const val = (k === "ERA" || k === "WHIP") ? c.value.toFixed(2) : String(Math.round(c.value));
        return `${k}:${val}(${c.rank}${ordinal(c.rank)})`;
      }).filter(Boolean).join(" ");
      statsLine = `${hitting} | ${pitching}`;
      categoryRankLine = Object.entries(catRanks).map(([k, v]) => `${k}:${v.rank}`).join(" ");
    }

    return {
      id: t.id,
      name: t.name,
      keyPlayers: t.rosters.slice(0, 6).map(r => `${r.player.name} (${r.player.posPrimary})`).join(", "),
      keeperNames: keepers.map(k => k.player.name).join(", "),
      recentMoves: (movesByTeam.get(t.id) || []).slice(0, 5).join("; "),
      overallRank: standingsRow?.rank ?? null,
      totalPoints: standingsRow?.points ?? null,
      statsLine,
      categoryRankLine,
    };
  });

  // Pre-compute narrative hints for the AI
  const narrativeHints: string[] = [];
  if (standingsCtx) {
    for (const cfg of CATEGORY_CONFIG) {
      const rows = computeCategoryRows(standingsCtx.teamStats, cfg.key, cfg.lowerIsBetter);
      if (rows.length >= 7) {
        const third = rows.find(r => r.rank === 3);
        const seventh = rows.find(r => r.rank === 7);
        if (third && seventh) {
          const spread = Math.abs(third.value - seventh.value);
          if (cfg.key === "AVG" && spread < 0.010) {
            narrativeHints.push(`Tight race in AVG: only ${(spread * 1000).toFixed(0)} points separate 3rd-7th`);
          } else if ((cfg.key === "ERA" || cfg.key === "WHIP") && spread < 0.50) {
            narrativeHints.push(`Tight race in ${cfg.key}: only ${spread.toFixed(2)} separates 3rd-7th`);
          } else if (spread < 10 && cfg.key !== "AVG" && cfg.key !== "ERA" && cfg.key !== "WHIP") {
            narrativeHints.push(`Tight race in ${cfg.key}: only ${Math.round(spread)} separates 3rd-7th`);
          }
        }
      }
    }
  }

  // Extract previous week's vote results
  let previousVotes: { yes: number; no: number } | null = null;
  if (prevDigest) {
    const prevData = (prevDigest.data ?? {}) as DigestData;
    const votes: Record<string, string> = prevData.votes || {};
    const yes = Object.values(votes).filter(v => v === "yes").length;
    const no = Object.values(votes).filter(v => v === "no").length;
    if (yes + no > 0) previousVotes = { yes, no };
  }

  return {
    leagueName: league.name,
    season: league.season,
    leagueType: ((league.rules as unknown as LeagueRulesPartial)?.leagueType) ?? "NL",
    teams: teamData,
    tradeStyle,
    weekNumber: weekNum,
    previousVotes,
    narrativeHints,
  };
}
