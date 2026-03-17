// server/src/scripts/update_from_mlb_api.ts
/**
 * Consolidated script to update historical player stats from MLB API.
 * Replaces: populate_position_team.ts, update_names_from_mlb.ts
 *
 * Fetches player info by MLB ID and updates fullName, position, and/or mlbTeam.
 *
 * Usage:
 *   npx tsx src/scripts/update_from_mlb_api.ts              # update all fields
 *   npx tsx src/scripts/update_from_mlb_api.ts --names      # update fullName only
 *   npx tsx src/scripts/update_from_mlb_api.ts --positions   # update position only
 *   npx tsx src/scripts/update_from_mlb_api.ts --teams       # update mlbTeam only
 *   npx tsx src/scripts/update_from_mlb_api.ts --year 2024   # specific year (default: all)
 */

import 'dotenv/config';
import { prisma } from '../db/prisma';
import { parseYear } from './lib/cli';

const MLB_API_BASE = 'https://statsapi.mlb.com/api/v1';

interface MlbPlayerInfo {
  id: number;
  fullName: string;
  primaryPosition?: { abbreviation: string };
  currentTeam?: { name: string };
}

// ── API ────────────────────────────────────────────────────────────────────

async function fetchMlbPlayerInfo(mlbId: number): Promise<MlbPlayerInfo | null> {
  try {
    const url = `${MLB_API_BASE}/people/${mlbId}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return data.people?.[0] || null;
  } catch {
    return null;
  }
}

// ── Core logic ─────────────────────────────────────────────────────────────

interface UpdateOptions {
  names: boolean;
  positions: boolean;
  teams: boolean;
  year: number | null;
}

async function updateFromMlb(options: UpdateOptions) {
  const { names, positions, teams, year } = options;
  const fieldsLabel = [names && 'names', positions && 'positions', teams && 'teams']
    .filter(Boolean)
    .join(', ');

  console.log(`\n=== Updating ${fieldsLabel} from MLB API ===`);
  if (year) console.log(`  Year filter: ${year}`);

  // Build where clause to find stats that need updating
  const yearFilter = year ? { period: { season: { year } } } : {};
  const needsUpdate: any[] = [];
  if (names) needsUpdate.push({ fullName: null });
  if (positions) needsUpdate.push({ position: null });
  if (teams) needsUpdate.push({ mlbTeam: null });

  // Get unique MLB IDs that need updates
  const statsToFetch = await prisma.historicalPlayerStat.findMany({
    where: {
      mlbId: { not: null },
      ...yearFilter,
      ...(needsUpdate.length > 0 ? { OR: needsUpdate } : {}),
    },
    select: { mlbId: true, playerName: true },
    distinct: ['mlbId'],
  });

  console.log(`  Found ${statsToFetch.length} unique MLB IDs to look up\n`);

  // Fetch info for each MLB ID
  const infoMap = new Map<string, MlbPlayerInfo>();
  let fetched = 0;
  let failed = 0;

  for (let i = 0; i < statsToFetch.length; i++) {
    const stat = statsToFetch[i];
    const mlbId = parseInt(stat.mlbId!);

    if (i > 0) await new Promise((r) => setTimeout(r, 50));

    const info = await fetchMlbPlayerInfo(mlbId);
    if (info) {
      infoMap.set(stat.mlbId!, info);
      fetched++;
      console.log(
        `  ${info.fullName} (${info.primaryPosition?.abbreviation || 'N/A'}) - ${info.currentTeam?.name || 'FA'}`
      );
    } else {
      failed++;
    }

    if ((i + 1) % 50 === 0) {
      console.log(`\n  --- Progress: ${i + 1}/${statsToFetch.length} ---\n`);
    }
  }

  console.log(`\nFetched: ${fetched} | Failed: ${failed}`);
  console.log('Applying updates...\n');

  // Apply updates to all matching stats
  const allStats = await prisma.historicalPlayerStat.findMany({
    where: { mlbId: { not: null }, ...yearFilter },
    select: { id: true, mlbId: true },
  });

  let updated = 0;
  for (const stat of allStats) {
    const info = infoMap.get(stat.mlbId!);
    if (!info) continue;

    const data: Record<string, any> = {};
    if (names) data.fullName = info.fullName;
    if (positions) data.position = info.primaryPosition?.abbreviation || 'UT';
    if (teams) data.mlbTeam = info.currentTeam?.name || 'Free Agent';

    if (Object.keys(data).length > 0) {
      await prisma.historicalPlayerStat.update({
        where: { id: stat.id },
        data,
      });
      updated++;
    }
  }

  console.log(`Updated ${updated} player stats\n`);
  return updated;
}

// ── CLI ────────────────────────────────────────────────────────────────────

async function main() {
  const hasNames = process.argv.includes('--names');
  const hasPositions = process.argv.includes('--positions');
  const hasTeams = process.argv.includes('--teams');
  const year = parseYear();

  // If no specific flags, update all fields
  const updateAll = !hasNames && !hasPositions && !hasTeams;

  await updateFromMlb({
    names: updateAll || hasNames,
    positions: updateAll || hasPositions,
    teams: updateAll || hasTeams,
    year,
  });
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
