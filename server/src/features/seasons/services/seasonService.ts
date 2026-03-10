import { prisma } from "../../../db/prisma.js";
import { logger } from "../../../lib/logger.js";
import { CommissionerService } from "../../commissioner/services/CommissionerService.js";

const commissionerService = new CommissionerService();

const VALID_TRANSITIONS: Record<string, string> = {
  SETUP: "DRAFT",
  DRAFT: "IN_SEASON",
  IN_SEASON: "COMPLETED",
};

export async function createSeason(leagueId: number, year: number) {
  // Check league exists
  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  if (!league) throw new Error("League not found");

  // Check no duplicate
  const existing = await prisma.season.findUnique({
    where: { leagueId_year: { leagueId, year } },
  });
  if (existing) throw new Error(`Season ${year} already exists for this league`);

  return prisma.season.create({
    data: { leagueId, year, status: "SETUP" },
    include: { periods: true },
  });
}

export async function getCurrentSeason(leagueId: number) {
  return prisma.season.findFirst({
    where: { leagueId, status: { not: "COMPLETED" } },
    orderBy: { year: "desc" },
    include: { periods: { orderBy: { startDate: "asc" } } },
  });
}

export async function getSeasons(leagueId: number) {
  return prisma.season.findMany({
    where: { leagueId },
    orderBy: { year: "desc" },
    include: { periods: { orderBy: { startDate: "asc" } } },
  });
}

export async function transitionStatus(seasonId: number, newStatus: string) {
  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    include: { periods: true },
  });
  if (!season) throw new Error("Season not found");

  const expected = VALID_TRANSITIONS[season.status];
  if (!expected || expected !== newStatus) {
    throw new Error(`Invalid transition: ${season.status} → ${newStatus}`);
  }

  // Transition-specific validation and side effects
  if (newStatus === "DRAFT") {
    // Auto-lock rules when entering DRAFT
    await commissionerService.lockRules(season.leagueId);
    logger.info({ seasonId, leagueId: season.leagueId }, "Rules auto-locked on DRAFT transition");
  }

  if (newStatus === "IN_SEASON") {
    // Validate at least one period exists
    if (season.periods.length === 0) {
      throw new Error("Cannot start season without at least one period");
    }
  }

  if (newStatus === "COMPLETED") {
    // Validate all periods are completed
    const incomplete = season.periods.filter((p) => p.status !== "completed");
    if (incomplete.length > 0) {
      throw new Error(`${incomplete.length} period(s) are not completed yet`);
    }
  }

  return prisma.season.update({
    where: { id: seasonId },
    data: { status: newStatus as any },
    include: { periods: { orderBy: { startDate: "asc" } } },
  });
}
