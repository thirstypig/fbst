// server/src/middleware/seasonGuard.ts
// Middleware that enforces season-status constraints on write endpoints.

import type { Request, Response, NextFunction, RequestHandler } from "express";
import { prisma } from "../db/prisma.js";

type SeasonStatus = "SETUP" | "DRAFT" | "IN_SEASON" | "COMPLETED";

/**
 * Middleware factory that rejects requests unless the league's current season
 * is in one of the allowed statuses.
 *
 * @param allowedStatuses - Season statuses that permit this action
 * @param leagueIdSource  - How to resolve leagueId:
 *   - "body.leagueId" (default) — reads from req.body.leagueId
 *   - "body.teamId"             — looks up team → leagueId
 */
export function requireSeasonStatus(
  allowedStatuses: SeasonStatus[],
  leagueIdSource: "body.leagueId" | "body.teamId" = "body.leagueId",
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      let leagueId: number | undefined;

      if (leagueIdSource === "body.leagueId") {
        leagueId = Number(req.body?.leagueId);
      } else if (leagueIdSource === "body.teamId") {
        const teamId = Number(req.body?.teamId);
        if (!teamId || !Number.isFinite(teamId)) {
          return res.status(400).json({ error: "Missing teamId" });
        }
        const team = await prisma.team.findUnique({
          where: { id: teamId },
          select: { leagueId: true },
        });
        if (!team) {
          return res.status(404).json({ error: "Team not found" });
        }
        leagueId = team.leagueId;
      }

      if (!leagueId || !Number.isFinite(leagueId)) {
        return res.status(400).json({ error: "Missing leagueId" });
      }

      // Find the current (non-COMPLETED) season for this league
      const season = await prisma.season.findFirst({
        where: { leagueId, status: { not: "COMPLETED" } },
        orderBy: { year: "desc" },
        select: { status: true },
      });

      const status = (season?.status ?? null) as SeasonStatus | null;

      if (!status || !allowedStatuses.includes(status)) {
        const allowed = allowedStatuses.join(" or ");
        return res.status(403).json({
          error: `This action is only allowed during ${allowed}. Current season status: ${status ?? "no active season"}.`,
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
