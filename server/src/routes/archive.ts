import express from 'express';
import { prisma } from '../db/prisma.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * GET /api/archive/seasons
 * Returns all years that have archive data
 */
router.get('/archive/seasons', async (req, res) => {
  try {
    const seasons = await prisma.historicalSeason.findMany({
      orderBy: { year: 'desc' },
      select: { year: true }
    });
    return res.json({ seasons: seasons.map(s => s.year) });
  } catch (error: any) {
    console.error('GET /archive/seasons error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to fetch archive seasons' });
  }
});

/**
 * GET /api/archive/:year/standings
 * Returns the final standings for a given year
 */
router.get('/archive/:year/standings', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    if (!Number.isFinite(year)) {
      return res.status(400).json({ error: 'Invalid year' });
    }

    const season = await prisma.historicalSeason.findFirst({
      where: { year },
      include: {
        standings: {
          orderBy: { finalRank: 'asc' }
        }
      }
    } as any); // Cast as any if Types overlap or mismatch

    if (!season) {
      return res.status(404).json({ error: `No archive found for year ${year}` });
    }

    return res.json({ 
      year,
      standings: (season as any).standings 
    });
  } catch (error: any) {
    console.error(`GET /archive/${req.params.year}/standings error:`, error);
    return res.status(500).json({ error: error?.message || 'Failed to fetch standings' });
  }
});

/**
 * GET /api/archive/:year/periods
 * Returns list of periods for a given year
 */
router.get('/archive/:year/periods', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    if (!Number.isFinite(year)) {
      return res.status(400).json({ error: 'Invalid year' });
    }

    const season = await prisma.historicalSeason.findFirst({
      where: { year },
      include: {
        periods: {
          select: {
            id: true,
            periodNumber: true,
            startDate: true,
            endDate: true,
            _count: {
              select: { stats: true },
            },
          },
          orderBy: { periodNumber: 'asc' },
        },
      },
    });

    if (!season) {
      return res.status(404).json({ error: `No archive found for year ${year}` });
    }

    return res.json({ 
      year,
      seasonId: season.id,
      periods: season.periods 
    });
  } catch (error: any) {
    console.error(`GET /archive/${req.params.year}/periods error:`, error);
    return res.status(500).json({ error: error?.message || 'Failed to fetch periods' });
  }
});

/**
 * PUT /api/archive/:year/teams/:teamCode
 * Update a historical team name (Admin only)
 */
router.put('/archive/:year/teams/:teamCode', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const { teamCode } = req.params;
    const { newName } = req.body;

    if (!year || !teamCode || !newName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const updated = await prisma.historicalStanding.updateMany({
      where: {
        season: { year },
        teamCode: teamCode.toUpperCase()
      },
      data: {
        teamName: newName
      }
    });

    if (updated.count === 0) {
      return res.status(404).json({ error: 'Team not found for this season' });
    }

    res.json({ success: true, message: 'Team updated', count: updated.count });
  } catch (err: any) {
    console.error('Error updating team name:', err);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

/**
 * GET /api/archive/:year/period/:num/stats
 * Returns all player stats for a specific period
 */
router.get('/archive/:year/period/:num/stats', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const periodNum = parseInt(req.params.num);

    if (!Number.isFinite(year) || !Number.isFinite(periodNum)) {
      return res.status(400).json({ error: 'Invalid year or period number' });
    }

    const season = await prisma.historicalSeason.findFirst({
      where: { year },
    });

    if (!season) {
      return res.status(404).json({ error: `No archive found for year ${year}` });
    }

    const period = await prisma.historicalPeriod.findFirst({
      where: {
        seasonId: season.id,
        periodNumber: periodNum,
      },
      include: {
        stats: {
          orderBy: [
            { isPitcher: 'asc' },
            { fullName: 'asc' },
            { playerName: 'asc' },
          ],
        },
      },
    });

    if (!period) {
      return res.status(404).json({ error: `No period ${periodNum} found for year ${year}` });
    }

    return res.json({
      year,
      periodNumber: period.periodNumber,
      startDate: period.startDate,
      endDate: period.endDate,
      stats: period.stats,
    });
  } catch (error: any) {
    console.error(`GET /archive/${req.params.year}/period/${req.params.num}/stats error:`, error);
    return res.status(500).json({ error: error?.message || 'Failed to fetch period stats' });
  }
});

/**
 * PATCH /api/archive/stat/:id
 * Updates player metadata for a historical stat record
 */
router.patch('/archive/stat/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Invalid stat ID' });
    }

    const { fullName, mlbId, mlbTeam, position } = req.body;

    // Build update object with only provided fields
    const updateData: Record<string, any> = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (mlbId !== undefined) updateData.mlbId = mlbId;
    if (mlbTeam !== undefined) updateData.mlbTeam = mlbTeam;
    if (position !== undefined) updateData.position = position;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const updated = await prisma.historicalPlayerStat.update({
      where: { id },
      data: updateData,
    });

    return res.json({ success: true, stat: updated });
  } catch (error: any) {
    console.error(`PATCH /archive/stat/${req.params.id} error:`, error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Stat record not found' });
    }
    return res.status(500).json({ error: error?.message || 'Failed to update stat' });
  }
});

/**
 * POST /api/archive/:year/recalculate
 * Re-fetches MLB team data for players based on context
 * - If tab='draft': uses Opening Day of that year
 * - If tab='stats' and periodNumber provided: uses that period's start date
 * - Otherwise: recalculates all periods using their start dates
 * Requires commissioner/admin role
 */
const OPENING_DAYS: Record<number, string> = {
  2024: '2024-03-20',
  2025: '2025-03-18',
  2026: '2026-03-25',
};

router.post('/archive/:year/recalculate', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    if (!Number.isFinite(year)) {
      return res.status(400).json({ error: 'Invalid year' });
    }

    const { tab, periodNumber } = req.body;
    const openingDay = OPENING_DAYS[year] || `${year}-03-28`; // Default to March 28

    // Load team abbreviations
    const teamsResponse = await fetch('https://statsapi.mlb.com/api/v1/teams?sportId=1&season=' + year);
    const teamsData = await teamsResponse.json() as any;
    const teamAbbreviations = new Map<number, string>();
    for (const team of teamsData.teams || []) {
      teamAbbreviations.set(team.id, team.abbreviation);
    }

    let updated = 0;
    const errors: string[] = [];

    // Helper to fetch team for a player on a specific date
    async function getTeamForDate(mlbId: string, date: string): Promise<string | null> {
      try {
        const url = `https://statsapi.mlb.com/api/v1/people/${mlbId}?hydrate=currentTeam&date=${date}`;
        const response = await fetch(url);
        const data = await response.json() as any;
        const person = data.people?.[0];
        
        let mlbTeam = person?.currentTeam?.abbreviation;
        if (!mlbTeam && person?.currentTeam?.id) {
          mlbTeam = teamAbbreviations.get(person.currentTeam.id);
        }
        return mlbTeam || null;
      } catch {
        return null;
      }
    }

    if (tab === 'draft') {
      // Recalculate using Opening Day for all players in the year
      console.log(`[Recalculate] Auction Draft - using Opening Day: ${openingDay}`);
      
      const stats = await prisma.historicalPlayerStat.findMany({
        where: {
          period: { season: { year }, periodNumber: 1 }, // Period 1 represents draft
          mlbId: { not: null }
        },
        select: { id: true, mlbId: true },
      });

      for (const stat of stats) {
        if (!stat.mlbId) continue;
        const mlbTeam = await getTeamForDate(stat.mlbId, openingDay);
        if (mlbTeam) {
          await prisma.historicalPlayerStat.update({
            where: { id: stat.id },
            data: { mlbTeam },
          });
          updated++;
        }
        await new Promise(resolve => setTimeout(resolve, 30)); // Rate limit
      }
    } else if (tab === 'stats' && periodNumber) {
      // Recalculate for a specific period using its start date
      const period = await prisma.historicalPeriod.findFirst({
        where: { season: { year }, periodNumber: parseInt(periodNumber) },
        include: { stats: { where: { mlbId: { not: null } }, select: { id: true, mlbId: true } } },
      });

      if (!period) {
        return res.status(404).json({ error: `Period ${periodNumber} not found for ${year}` });
      }

      const dateStr = period.startDate?.toISOString().split('T')[0] || openingDay;
      console.log(`[Recalculate] Period ${periodNumber} - using date: ${dateStr}`);

      for (const stat of period.stats) {
        if (!stat.mlbId) continue;
        const mlbTeam = await getTeamForDate(stat.mlbId, dateStr);
        if (mlbTeam) {
          await prisma.historicalPlayerStat.update({
            where: { id: stat.id },
            data: { mlbTeam },
          });
          updated++;
        }
        await new Promise(resolve => setTimeout(resolve, 30)); // Rate limit
      }
    } else {
      // Recalculate all periods
      const periods = await prisma.historicalPeriod.findMany({
        where: { season: { year } },
        include: { stats: { where: { mlbId: { not: null } }, select: { id: true, mlbId: true } } },
        orderBy: { periodNumber: 'asc' },
      });

      for (const period of periods) {
        const dateStr = period.startDate?.toISOString().split('T')[0];
        if (!dateStr) continue;

        console.log(`[Recalculate] Period ${period.periodNumber} - using date: ${dateStr}`);

        for (const stat of period.stats) {
          if (!stat.mlbId) continue;
          const mlbTeam = await getTeamForDate(stat.mlbId, dateStr);
          if (mlbTeam) {
            await prisma.historicalPlayerStat.update({
              where: { id: stat.id },
              data: { mlbTeam },
            });
            updated++;
          }
          await new Promise(resolve => setTimeout(resolve, 30)); // Rate limit
        }
      }
    }

    return res.json({
      success: true,
      year,
      tab: tab || 'all',
      periodNumber: periodNumber || null,
      updated,
      errors: errors.slice(0, 10),
    });
  } catch (error: any) {
    console.error(`POST /archive/${req.params.year}/recalculate error:`, error);
    return res.status(500).json({ error: error?.message || 'Failed to recalculate' });
  }
});

/**
 * GET /api/archive/search-players?query=:name
 * Search current Player table for MLB player lookup
 */
router.get('/archive/search-players', async (req, res) => {
  try {
    const query = req.query.query as string;
    
    if (!query || query.trim().length < 2) {
      return res.json({ players: [] });
    }

    const players = await prisma.player.findMany({
      where: {
        name: {
          contains: query.trim(),
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        name: true,
        mlbId: true,
        posPrimary: true,
      },
      take: 10,
      orderBy: { name: 'asc' },
    });

    return res.json({ players });
  } catch (error: any) {
    console.error('GET /archive/search-players error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to search players' });
  }
});

/**
 * GET /archive/search-mlb
 * Search the MLB Stats API directly for players
 */
router.get('/archive/search-mlb', async (req, res) => {
  try {
    const query = req.query.query as string;
    if (!query || query.trim().length < 2) {
      return res.json({ players: [] });
    }

    const MLB_API_BASE = 'https://statsapi.mlb.com/api/v1';
    const url = `${MLB_API_BASE}/people/search?names=${encodeURIComponent(query.trim())}&sportId=1`;
    
    const response = await fetch(url);
    if (!response.ok) return res.json({ players: [] });

    const data = await response.json() as any;
    const players = (data.people || []).slice(0, 10).map((p: any) => ({
      id: p.id,
      name: p.fullName,
      mlbId: p.id,
      position: p.primaryPosition?.abbreviation || 'UT',
      team: p.currentTeam?.name || 'Free Agent',
      active: p.active,
    }));

    return res.json({ players });
  } catch (error: any) {
    console.error('GET /archive/search-mlb error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to search MLB API' });
  }
});

/**
 * GET /api/archive/:year/period-results
 * Returns cumulative standings for all periods
 */
router.get('/archive/:year/period-results', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const season = await prisma.historicalSeason.findFirst({
      where: { year },
      include: {
        periods: {
          include: { stats: true },
          orderBy: { periodNumber: 'asc' }
        }
      }
    });

    if (!season) return res.status(404).json({ error: 'Season not found' });

    // Calculate cumulative standings per period
    const results = [];
    const teamStats: Record<string, {
      R: number, HR: number, RBI: number, SB: number,
      W: number, SV: number, K: number, 
      total_ab: number, total_h: number, total_er: number, total_ip: number, total_whip_comp: number
    }> = {};

    for (const period of season.periods) {
      // Accumulate stats
      for (const stat of period.stats) {
        if (!teamStats[stat.teamCode]) {
          teamStats[stat.teamCode] = {
            R: 0, HR: 0, RBI: 0, SB: 0,
            W: 0, SV: 0, K: 0,
            total_ab: 0, total_h: 0, total_er: 0, total_ip: 0, total_whip_comp: 0
          };
        }
        const ts = teamStats[stat.teamCode];
        ts.R += stat.R || 0;
        ts.HR += stat.HR || 0;
        ts.RBI += stat.RBI || 0;
        ts.SB += stat.SB || 0;
        ts.total_ab += stat.AB || 0;
        ts.total_h += stat.H || 0;

        ts.W += stat.W || 0;
        ts.SV += stat.SV || 0;
        ts.K += stat.K || 0;
        ts.total_ip += stat.IP || 0;
        ts.total_er += stat.ER || 0;
        // WHIP component: HA + BB = WHIP * IP
        ts.total_whip_comp += ((stat.WHIP || 0) * (stat.IP || 0));
      }

      // Calculate ratios
      const teams = Object.keys(teamStats).map(code => {
        const ts = teamStats[code];
        return {
          teamCode: code,
          R: ts.R, HR: ts.HR, RBI: ts.RBI, SB: ts.SB,
          AVG: ts.total_ab > 0 ? ts.total_h / ts.total_ab : 0,
          W: ts.W, SV: ts.SV, K: ts.K,
          ERA: ts.total_ip > 0 ? (ts.total_er * 9) / ts.total_ip : 0,
          WHIP: ts.total_ip > 0 ? ts.total_whip_comp / ts.total_ip : 0
        };
      });

      // Rank and score
      const categories = ['R', 'HR', 'RBI', 'SB', 'AVG', 'W', 'SV', 'K', 'ERA', 'WHIP'];
      const teamScores: Record<string, number> = {};
      teams.forEach(t => teamScores[t.teamCode] = 0);

      categories.forEach(cat => {
        const sorted = [...teams].sort((a, b) => {
          const valA = a[cat as keyof typeof a] as number;
          const valB = b[cat as keyof typeof b] as number;
          if (cat === 'ERA' || cat === 'WHIP') return valA - valB;
          return valB - valA;
        });
        
        // Handle ties (simplified: just use index)
        sorted.forEach((t, i) => {
          teamScores[t.teamCode] += (teams.length - i);
        });
      });

      results.push({
        periodNumber: period.periodNumber,
        standings: teams.length > 0 ? teams.map(t => ({
          teamCode: t.teamCode,
          totalScore: teamScores[t.teamCode]
        })).sort((a, b) => b.totalScore - a.totalScore) : []
      });
    }

    return res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/archive/:year/draft-results
 * Returns auction draft results with player $ values and pre-draft trades
 */
router.get('/archive/:year/draft-results', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    if (!Number.isFinite(year)) {
      return res.status(400).json({ error: 'Invalid year' });
    }

    // Standardized auction draft file name: draft_YYYY_auction.csv
    const draftPath = path.join(__dirname, `../data/archive/${year}/draft_${year}_auction.csv`);
    const tradesPath = path.join(__dirname, `../data/archive/${year}/draft_${year}_trades.csv`);

    if (!fs.existsSync(draftPath)) {
      return res.status(404).json({ error: `No draft results found for ${year}` });
    }

    const period1 = await prisma.historicalPeriod.findFirst({
      where: { season: { year }, periodNumber: 1 },
      include: {
        stats: {
          select: { playerName: true, fullName: true, mlbId: true, mlbTeam: true, teamCode: true, position: true }
        }
      }
    });

    const playerLookup = new Map<string, any>();
    if (period1?.stats) {
      for (const stat of period1.stats) {
        playerLookup.set(`${stat.playerName.toLowerCase()}_${stat.teamCode}`, stat);
      }
    }

    const trades: any[] = [];
    if (fs.existsSync(tradesPath)) {
      const content = fs.readFileSync(tradesPath, 'utf-8');
      const lines = content.trim().split('\n').slice(1);
      for (const line of lines) {
        const [fName, fCode, tName, tCode, amt, note] = line.split(',');
        if (fCode && tCode) {
          trades.push({ fromTeamName: fName, fromTeamCode: fCode, toTeamName: tName, toTeamCode: tCode, amount: parseFloat(amt) || 0, note });
        }
      }
    }

    const draftContent = fs.readFileSync(draftPath, 'utf-8').replace(/^\uFEFF/, '');
    const draftLines = draftContent.trim().split(/\r?\n/);
    if (draftLines.length <= 1) return res.json({ year, players: [], trades });

    // Robust header detection
    const headers = draftLines[0].toLowerCase().split(',').map(h => h.trim().replace(/^"/, '').replace(/"$/, ''));
    console.log('Draft headers:', headers);
    
    // Find columns by keyword matching
    const idxName = headers.findIndex(h => h.includes('player') && h.includes('name') || h === 'player');
    const idxTeam = headers.findIndex(h => h.includes('team') && h.includes('code') || h === 'team');
    // Pitcher column: might be "is_pitcher", "pitcher", "pos_type" etc.
    const idxPitcher = headers.findIndex(h => h.includes('pitcher'));
    const idxPos = headers.findIndex(h => h === 'position' || h === 'pos');
    // Dollars: "draft_dollars", "amount", "cost", "salary"
    const idxDollars = headers.findIndex(h => h.includes('dollar') || h.includes('amount') || h.includes('cost') || h.includes('salary'));
    
    console.log('Indices:', { idxName, idxTeam, idxPitcher, idxPos, idxDollars });

    const players: any[] = [];
    for (let i = 1; i < draftLines.length; i++) {
        const line = draftLines[i].trim();
        if (!line) continue;

        const values: string[] = [];
        let current = '';
        let inQuotes = false;
        for (const char of line) {
          if (char === '"') inQuotes = !inQuotes;
          else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
          } else current += char;
        }
        values.push(current.trim());

        const pName = values[idxName];
        const tCode = values[idxTeam];
        if (!pName || !tCode) continue;

        const enriched = playerLookup.get(`${pName.toLowerCase()}_${tCode}`);
        
        players.push({
          playerName: pName,
          fullName: enriched?.fullName || pName,
          teamCode: tCode,
          position: values[idxPos] || (values[idxPitcher]?.toLowerCase() === 'true' ? 'P' : 'UT'),
          mlbTeam: enriched?.mlbTeam || null,
          draftDollars: parseInt(values[idxDollars]) || 0,
          isPitcher: values[idxPitcher]?.toLowerCase() === 'true',
        });
    }

    return res.json({ year, players, trades });
  } catch (error: any) {
    console.error('GET /archive/:year/draft-results error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

import multer from 'multer';
import { ArchiveImportService } from '../services/archiveImportService.js';

// Configure multer
const upload = multer({ dest: path.join(__dirname, '../data/uploads/') });

// Ensure upload directory exists
if (!fs.existsSync(path.join(__dirname, '../data/uploads/'))) {
  fs.mkdirSync(path.join(__dirname, '../data/uploads/'), { recursive: true });
}

/**
 * POST /api/archive/:year/import-excel
 * Uploads an Excel file, converts it to CSVs, and imports data
 */
router.post('/archive/:year/import-excel', upload.single('file'), async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    if (!Number.isFinite(year)) {
      return res.status(400).json({ error: 'Invalid year' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const importer = new ArchiveImportService(year);
    
    // Process
    const result = await importer.processAndImport(filePath);

    // Cleanup
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    if (!result.success) {
      return res.status(500).json({ error: 'Import failed', logs: result.messages });
    }

    return res.json({ success: true, logs: result.messages });

  } catch (err: any) {
    console.error('Import error:', err);
    return res.status(500).json({ error: err?.message || 'Import failed' });
  }
});

export const archiveRouter = router;
export default archiveRouter;
