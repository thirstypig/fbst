import { Router } from "express";
import prisma from "../prisma";

const router = Router();

import {
  CATEGORY_CONFIG,
  CategoryKey,
  computeCategoryRows,
  computeStandingsFromStats,
} from "../services/standingsService.js";

// --- Period standings: /api/standings/period/current ---

router.get("/period/current", async (req, res) => {
  try {
    const period =
      (await prisma.period.findFirst({
        where: { status: "active" },
        orderBy: { startDate: "asc" },
      })) ||
      (await prisma.period.findFirst({
        where: { id: 1 },
      }));

    if (!period) {
      return res
        .status(404)
        .json({ error: "No active period found and no default period with id=1" });
    }

    const stats = await prisma.teamStatsPeriod.findMany({
      where: { periodId: period.id },
      include: {
        team: true,
      },
    });

    const standings = computeStandingsFromStats(stats);

    res.json({
      periodId: period.id,
      data: standings,
    });
  } catch (e) {
    console.error("Error fetching period standings:", e);
    res.status(500).json({ error: "Failed to fetch period standings" });
  }
});

// --- Period category standings: /api/period-category-standings ---

router.get("/period-category-standings", async (req, res) => {
  try {
    const periodIdRaw = req.query.periodId ? String(req.query.periodId) : "1";
    
    // Parse keys like "1", "P1", "Period 1"
    const m = periodIdRaw.match(/(\d+)/);
    const pid = m ? parseInt(m[1], 10) : 1;

    const period = await prisma.period.findUnique({
      where: { id: pid },
    });

    if (!period) {
       // fallback to period 1 if not found, or error? 
       // Client expects success mostly, but 404 is fine.
       // Let's return 404 to be specific.
       return res.status(404).json({ error: `Period ${pid} not found` });
    }

    const stats = await prisma.teamStatsPeriod.findMany({
      where: { periodId: period.id },
      include: { team: true },
    });

    const categories = CATEGORY_CONFIG.map((cfg) => {
      const rows = computeCategoryRows(
        stats,
        cfg.key as CategoryKey,
        cfg.lowerIsBetter
      );
      return {
        id: cfg.key, 
        key: cfg.key,
        label: cfg.label,
        rows: rows.map(r => ({
           ...r,
           teamCode: r.teamName.substring(0, 3).toUpperCase() // Fallback code if not in DB? 
           // Wait, teamStats link to Team. Team has 'code' and 'name'.
           // Existing computeCategoryRows uses team.name.
           // Let's verify Team model.
        })),
      };
    });
    
    // The computeCategoryRows helper returns { teamId, teamName, value, rank, points }
    // We need to make sure we return what the client needs.
    // Client api.ts CategoryStandingsRow: { team: string, stats:..., points:... } 
    // Wait, client uses `getPeriodCategoryStandings` which returns `PeriodCategoryStandingsResponse`.
    // Period.tsx ignores the specific `PeriodCategoryStandingsResponse` type structure and processes `categories` directly.
    // Period.tsx: 
    // Loop `resp.categories`: `const code = (r as any).teamCode;` `const name = (r as any).teamName;`
    // So distinct from `rows`?
    
    // Wait, let's look at the endpoint we are replacing in index.ts (step 778).
    // It returns `categories: ...` ? No, index.ts implementation (step 778) returns `rows: PeriodTeamRow[]`.
    // `app.get("/api/period-category-standings", ...)` in index.ts returns:
    // `res.json({ periodId: pidNum, rows: outRows })` (I need to see line 958 in api.ts, wait step 740 shows api.ts processing.
    // The client `getPeriodCategoryStandings` expects `PeriodCategoryStandingsResponse`.
    // step 735: export type PeriodStandingsResponse = { periodId: number; rows: PeriodTeamRow[] }
    // and PeriodTeamRow = { teamId, teamName, stats, points, totalPoints } where stats is Record<CategoryId, number>.
    
    // BUT `Period.tsx` (step 726) logic `buildStandings` handles `resp.categories`.
    // Line 110: `for (const cat of resp.categories ?? [])`
    // So the client supports BOTH shapes? Or I was looking at `getCategoryStandings` vs `getPeriodCategoryStandings`.
    
    // Let's re-read client/src/api.ts step 766 `getPeriodCategoryStandings` calls `/period-category-standings`.
    // Step 726 `Period.tsx` calls `getPeriodCategoryStandings`.
    // And uses `resp.categories`.
    // So `/period-category-standings` MUST return `{ categories: [...] }`.
    
    // HOWEVER, the `server/src/index.ts` implementation I saw in step 778 (partially) seemed to process `periodStats` array.
    // Let's re-read step 778.
    // lines 527 onwards.
    // line 538 `rows = periodStats.filter...`
    // It constructs `byTeam` stats.
    // I don't see the response structure in step 778 snippet (it cuts off at 600).
    // I suspect index.ts returns `rows` (PeriodTeamRow[]) AND `categories`? Or just `rows`?
    
    // If Period.tsx expects `categories`, then the response must have `categories`.
    // My previous view of `server/src/routes/standings.ts` (step 722) `/period/current/categories` returned `{ periodId, categories }`.
    // This matches `Period.tsx` logic perfectly.
    // So replacing `/period/current/categories` with `/period-category-standings` name but KEEPING the structure is the right move.
    // The `index.ts` inline code might have been implementing a different shape or I missed the end of it.
    
    // Summary: I will adapt `/period/current/categories` logic to use `req.query.periodId` and mount it as `/period-category-standings`.
    
    res.json({
      periodId: period.id,
      categories,
      // Add teamCount which Period.tsx uses
      teamCount: stats.length, 
    });
  } catch (e) {
    console.error("Error fetching period standings:", e);
    res.status(500).json({ error: "Failed to fetch period standings" });
  }
});

// --- Season (cumulative) standings: /api/standings/season ---

router.get("/season", async (req, res) => {
  try {
    const stats = await prisma.teamStatsSeason.findMany({
      include: { team: true },
    });

    if (stats.length === 0) {
      return res.json({ data: [] });
    }

    const standings = computeStandingsFromStats(stats);

    // enrich each with raw season stats for display
    const byId = new Map<number, any>();
    for (const s of stats) {
      byId.set(s.teamId, s);
    }

    const data = standings.map((row) => {
      const s = byId.get(row.teamId);
      return {
        ...row,
        R: s.R,
        HR: s.HR,
        RBI: s.RBI,
        SB: s.SB,
        AVG: s.AVG,
        W: s.W,
        S: s.S,
        ERA: s.ERA,
        WHIP: s.WHIP,
        K: s.K,
      };
    });

    res.json({ data });
  } catch (e) {
    console.error("Error fetching season standings:", e);
    res.status(500).json({ error: "Failed to fetch season standings" });
  }
});

export default router;
