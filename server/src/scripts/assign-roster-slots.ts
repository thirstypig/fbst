/**
 * Auto-assign players to league roster slots based on position eligibility.
 *
 * Slot structure (from league rules): C×2, 1B×1, 2B×1, 3B×1, SS×1, MI×1, CM×1, OF×5, DH×1 = 14 hitters, P×9 = 9 pitchers
 *
 * Algorithm:
 *   1. Pitchers → P
 *   2. Hitters assigned greedily by specificity: fill C, 1B, 2B, 3B, SS first (most constrained)
 *   3. Overflow to flex: MI (2B/SS eligible), CM (1B/3B eligible), DH (anyone)
 *   4. Remaining hitters → OF or DH (outfielders first, then utility)
 *
 * Usage: npx tsx src/scripts/assign-roster-slots.ts [--dry-run]
 */

import { prisma } from "../db/prisma.js";

const PITCHER_POS = new Set(["P", "SP", "RP", "CL", "TWP"]);

// Map MLB position to the primary league slot it can fill
function primarySlot(pos: string): string {
  const p = pos.trim().toUpperCase();
  if (p === "C") return "C";
  if (p === "1B") return "1B";
  if (p === "2B") return "2B";
  if (p === "3B") return "3B";
  if (p === "SS") return "SS";
  if (["LF", "CF", "RF", "OF"].includes(p)) return "OF";
  if (p === "DH") return "DH";
  if (PITCHER_POS.has(p)) return "P";
  return "DH"; // fallback
}

// What flex slots can this position fill?
function flexSlots(pos: string): string[] {
  const p = pos.trim().toUpperCase();
  if (p === "1B") return ["CM", "DH"];
  if (p === "2B") return ["MI", "DH"];
  if (p === "3B") return ["CM", "DH"];
  if (p === "SS") return ["MI", "DH"];
  if (p === "C") return ["DH"];
  if (["LF", "CF", "RF", "OF"].includes(p)) return ["DH"];
  return ["DH"];
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  // Get league 20 roster slot config
  const rule = await prisma.leagueRule.findFirst({
    where: { leagueId: 20, key: "roster_positions" },
  });
  const slotConfig: Record<string, number> = rule
    ? JSON.parse(rule.value)
    : { C: 2, "1B": 1, "2B": 1, "3B": 1, SS: 1, MI: 1, CM: 1, OF: 5, DH: 1 };

  console.log("Slot config:", slotConfig);

  // Load auction state to find positions manually set during import
  const session = await prisma.auctionSession.findUnique({ where: { leagueId: 20 } });
  const auctionState = session?.state as any;
  const auctionPositions = new Map<string, string>(); // playerName → position
  if (auctionState?.teams) {
    for (const team of auctionState.teams) {
      for (const player of (team.roster || [])) {
        const pos = player.assignedPosition;
        if (pos && pos !== "?" && pos !== "") {
          // Map CI → CM (corner infield → cornerman in our system)
          auctionPositions.set(player.playerName, pos === "CI" ? "CM" : pos);
        }
      }
    }
  }
  console.log("Auction-locked positions:", Object.fromEntries(auctionPositions));

  // Get all teams in league 20
  const teams = await prisma.team.findMany({
    where: { leagueId: 20 },
    include: {
      rosters: {
        where: { releasedAt: null },
        include: { player: { select: { id: true, name: true, posPrimary: true, posList: true } } },
      },
    },
    orderBy: { id: "asc" },
  });

  let totalUpdated = 0;

  for (const team of teams) {
    console.log(`\n=== ${team.name} (${team.rosters.length} players) ===`);

    // Separate pitchers from hitters
    const pitchers = team.rosters.filter(r => PITCHER_POS.has((r.player.posPrimary ?? "").toUpperCase()));
    const hitters = team.rosters.filter(r => !PITCHER_POS.has((r.player.posPrimary ?? "").toUpperCase()));

    // Assign all pitchers to P
    const assignments = new Map<number, string>(); // rosterId → slot
    for (const p of pitchers) {
      assignments.set(p.id, "P");
    }

    // Build available slot counts
    const available: Record<string, number> = { ...slotConfig };

    // Phase 0: Lock in auction-set positions first (these are user-configured and take priority)
    const unassigned = new Set(hitters.map(h => h.id));
    for (const h of hitters) {
      const auctionPos = auctionPositions.get(h.player.name);
      if (auctionPos) {
        assignments.set(h.id, auctionPos);
        if (available[auctionPos] !== undefined) available[auctionPos]--;
        unassigned.delete(h.id);
      }
    }

    // Phase 1: Assign remaining hitters to their primary slot (most constrained first)
    const slotPriority = ["C", "1B", "3B", "SS", "2B"]; // most constrained positions first

    for (const slot of slotPriority) {
      if (!available[slot] || available[slot] <= 0) continue;

      // Find hitters whose primary position maps to this slot
      const candidates = hitters.filter(h => {
        if (!unassigned.has(h.id)) return false;
        const primary = primarySlot(h.player.posPrimary ?? "");
        return primary === slot;
      });

      // Sort by price descending (most expensive = most likely starter at this position)
      candidates.sort((a, b) => b.price - a.price);

      for (const candidate of candidates) {
        if (available[slot] <= 0) break;
        assignments.set(candidate.id, slot);
        available[slot]--;
        unassigned.delete(candidate.id);
      }
    }

    // Phase 2: Assign outfielders to OF slots
    const ofCandidates = hitters.filter(h => {
      if (!unassigned.has(h.id)) return false;
      const primary = primarySlot(h.player.posPrimary ?? "");
      return primary === "OF";
    });
    ofCandidates.sort((a, b) => b.price - a.price);

    for (const candidate of ofCandidates) {
      if ((available["OF"] ?? 0) <= 0) break;
      assignments.set(candidate.id, "OF");
      available["OF"]--;
      unassigned.delete(candidate.id);
    }

    // Phase 3: Assign remaining hitters to flex slots (MI, CM, DH)
    const remaining = hitters.filter(h => unassigned.has(h.id));
    remaining.sort((a, b) => b.price - a.price);

    for (const h of remaining) {
      const pos = (h.player.posPrimary ?? "").toUpperCase();
      const flexOptions = flexSlots(pos);

      let assigned = false;
      for (const flex of flexOptions) {
        if ((available[flex] ?? 0) > 0) {
          assignments.set(h.id, flex);
          available[flex]--;
          unassigned.delete(h.id);
          assigned = true;
          break;
        }
      }

      // If still unassigned, try OF (for outfielders) or DH
      if (!assigned) {
        if ((available["OF"] ?? 0) > 0) {
          assignments.set(h.id, "OF");
          available["OF"]--;
          unassigned.delete(h.id);
        } else if ((available["DH"] ?? 0) > 0) {
          assignments.set(h.id, "DH");
          available["DH"]--;
          unassigned.delete(h.id);
        } else {
          // All slots full — assign to primary position anyway
          assignments.set(h.id, primarySlot(pos));
          unassigned.delete(h.id);
          console.log(`  WARNING: No slot available for ${h.player.name} (${pos}) — assigned to ${primarySlot(pos)}`);
        }
      }
    }

    // Print and apply assignments
    for (const roster of team.rosters) {
      const slot = assignments.get(roster.id);
      const current = roster.assignedPosition;
      const changed = slot && slot !== current;
      const marker = changed ? " ← CHANGED" : "";
      console.log(`  ${(slot ?? "?").padEnd(4)} ${roster.player.name.padEnd(25)} (was: ${(current ?? "null").padEnd(4)})${marker}`);

      if (changed && !dryRun) {
        await prisma.roster.update({
          where: { id: roster.id },
          data: { assignedPosition: slot },
        });
        totalUpdated++;
      }
    }
  }

  console.log(`\n${dryRun ? "[DRY RUN] Would update" : "Updated"} ${totalUpdated} roster entries`);
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
