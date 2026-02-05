import { prisma } from "../db/prisma.js";
import { AuctionImportService } from "./auctionImport.js";

const auctionImportService = new AuctionImportService();

function normStr(v: any) {
  return String(v ?? "").trim();
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Default rule definitions
const DEFAULT_RULES = [
  // Overview
  { category: "overview", key: "team_count", value: "8", label: "Number of Teams" },
  { category: "overview", key: "stats_source", value: "NL", label: "Stats Source" },
  // Roster
  { category: "roster", key: "pitcher_count", value: "9", label: "Pitchers per Team" },
  { category: "roster", key: "batter_count", value: "14", label: "Batters per Team" },
  { category: "roster", key: "roster_positions", value: JSON.stringify({ "C": 2, "1B": 1, "2B": 1, "3B": 1, "SS": 1, "MI": 1, "CI": 1, "OF": 5, "DH": 1 }), label: "Batter Positions" },
  // Scoring
  { category: "scoring", key: "hitting_stats", value: JSON.stringify(["R", "HR", "RBI", "SB", "AVG", "OPS", "H", "2B", "3B", "BB"]), label: "Hitting Categories" },
  { category: "scoring", key: "pitching_stats", value: JSON.stringify(["W", "SV", "K", "ERA", "WHIP", "QS", "HLD", "IP", "CG", "SHO"]), label: "Pitching Categories" },
  { category: "scoring", key: "min_innings", value: "50", label: "Minimum Innings per Period" },
  // Draft
  { category: "draft", key: "draft_mode", value: "AUCTION", label: "Draft Mode" },
  { category: "draft", key: "draft_type", value: "SNAKE", label: "Draft Type" },
  { category: "draft", key: "auction_budget", value: "260", label: "Auction Budget ($)" },
  { category: "draft", key: "min_bid", value: "1", label: "Minimum Bid ($)" },
  { category: "draft", key: "keeper_count", value: "4", label: "Keepers per Team" },
  // IL
  { category: "il", key: "il_slot_1_cost", value: "10", label: "1st IL Slot Cost ($)" },
  { category: "il", key: "il_slot_2_cost", value: "15", label: "2nd IL Slot Cost ($)" },
  // Bonuses
  { category: "bonuses", key: "grand_slam", value: "5", label: "Grand Slam Bonus ($)" },
  { category: "bonuses", key: "shutout", value: "5", label: "Shutout Bonus ($)" },
  { category: "bonuses", key: "cycle", value: "10", label: "Cycle Bonus ($)" },
  { category: "bonuses", key: "no_hitter", value: "15", label: "No Hitter Bonus ($)" },
  { category: "bonuses", key: "perfect_game", value: "25", label: "Perfect Game Bonus ($)" },
  { category: "bonuses", key: "mvp", value: "25", label: "MVP Award ($)" },
  { category: "bonuses", key: "cy_young", value: "25", label: "Cy Young Award ($)" },
  { category: "bonuses", key: "roy", value: "10", label: "Rookie of the Year ($)" },
  // Payouts
  { category: "payouts", key: "entry_fee", value: "300", label: "Team Entry Fee ($)" },
  { category: "payouts", key: "payout_1st", value: "40", label: "1st Place (%)" },
  { category: "payouts", key: "payout_2nd", value: "25", label: "2nd Place (%)" },
  { category: "payouts", key: "payout_3rd", value: "15", label: "3rd Place (%)" },
  { category: "payouts", key: "payout_4th", value: "10", label: "4th Place (%)" },
  { category: "payouts", key: "payout_5th", value: "5", label: "5th Place (%)" },
  { category: "payouts", key: "payout_6th", value: "3", label: "6th Place (%)" },
  { category: "payouts", key: "payout_7th", value: "2", label: "7th Place (%)" },
  { category: "payouts", key: "payout_8th", value: "0", label: "8th Place (%)" },
];

export class CommissionerService {
  /**
   * League Management
   */
// ... existing methods ...
  /**
   * Rules Management
   */
  async createLeague(data: {
    name: string;
    season: number;
    draftMode: "AUCTION" | "DRAFT";
    draftOrder?: "SNAKE" | "LINEAR";
    isPublic: boolean;
    publicSlug?: string;
    copyFromLeagueId?: number;
    creatorUserId: number;
  }) {
    const {
      name,
      season,
      draftMode,
      draftOrder,
      isPublic,
      publicSlug: publicSlugInput,
      copyFromLeagueId,
      creatorUserId,
    } = data;

    const baseSlug = slugify(publicSlugInput || `${name}-${season}`);
    const publicSlug = isPublic ? baseSlug : null;

    // 1. Create League
    const league = await prisma.league.create({
      data: {
        name,
        season,
        draftMode,
        draftOrder: draftOrder || undefined,
        isPublic,
        publicSlug: publicSlug || undefined,
      },
    });

    // 2. Add Creator as Commissioner
    await prisma.leagueMembership.upsert({
      where: {
        leagueId_userId: { leagueId: league.id, userId: creatorUserId },
      },
      create: {
        leagueId: league.id,
        userId: creatorUserId,
        role: "COMMISSIONER",
      },
      update: {
        role: "COMMISSIONER",
      },
    });

    // 3. Copy Data (if requested)
    if (copyFromLeagueId && copyFromLeagueId > 0) {
      await this.copyLeagueData(league.id, copyFromLeagueId, creatorUserId);
    }

    return league;
  }

  private async copyLeagueData(
    targetLeagueId: number,
    sourceLeagueId: number,
    creatorUserId: number,
  ) {
    console.log(
      `Copying league data from ${sourceLeagueId} to ${targetLeagueId}`,
    );

    // 1. Copy Teams
    const sourceTeams = await prisma.team.findMany({
      where: { leagueId: sourceLeagueId },
    });
    for (const t of sourceTeams) {
      try {
        await prisma.team.create({
          data: {
            leagueId: targetLeagueId,
            name: t.name,
            code: t.code,
            owner: t.owner,
            ownerUserId: t.ownerUserId,
            budget: t.budget,
          },
        });
      } catch (e) {
        console.warn("Failed to copy team", t.name, e);
      }
    }

    // 2. Copy Memberships
    const sourceMembers = await prisma.leagueMembership.findMany({
      where: { leagueId: sourceLeagueId },
    });
    for (const m of sourceMembers) {
      if (m.userId === creatorUserId) continue; // Already added
      try {
        await prisma.leagueMembership.create({
          data: {
            leagueId: targetLeagueId,
            userId: m.userId,
            role: m.role,
          },
        });
      } catch (e) {
        console.warn("Failed to copy member", m.userId, e);
      }
    }

    // 3. Copy Rules
    const sourceRules = await prisma.leagueRule.findMany({
      where: { leagueId: sourceLeagueId },
    });
    if (sourceRules.length > 0) {
      await prisma.leagueRule.createMany({
        data: sourceRules.map((r) => ({
          leagueId: targetLeagueId,
          category: r.category,
          key: r.key,
          value: r.value,
          label: r.label,
          isLocked: false,
        })),
      });
    }
  }

  async addMember(
    leagueId: number,
    data: {
      userId?: number;
      email?: string;
      role: "COMMISSIONER" | "OWNER" | "VIEWER";
    },
  ) {
    const { userId: userIdRaw, email: emailRaw, role } = data;

    let userId: number | null = null;

    if (userIdRaw != null) {
      userId = userIdRaw;
    } else if (emailRaw) {
      const u = await prisma.user.findUnique({
        where: { email: emailRaw.toLowerCase().trim() },
      });
      if (!u) {
        throw new Error(
          "User not found by email. That user must log in once first.",
        );
      }
      userId = u.id;
    } else {
      throw new Error("Provide userId or email");
    }

    const league = await prisma.league.findUnique({ where: { id: leagueId } });
    if (!league) throw new Error("League not found");

    return await prisma.leagueMembership.upsert({
      where: { leagueId_userId: { leagueId, userId } },
      create: { leagueId, userId, role },
      update: { role },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            isAdmin: true,
          },
        },
      },
    });
  }

  /**
   * Team Management
   */
  async createTeam(
    leagueId: number,
    data: {
      name: string;
      code?: string;
      owner?: string;
      budget?: number;
      priorTeamId?: number;
    },
  ) {
    const { name, code, owner, budget, priorTeamId } = data;

    return await prisma.team.create({
      data: {
        leagueId,
        name: normStr(name),
        code: code ? normStr(code).toUpperCase() : undefined,
        owner: owner ? normStr(owner) : undefined,
        budget: budget,
        priorTeamId: priorTeamId,
      },
      include: {
        ownerUser: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            isAdmin: true,
          },
        },
        ownerships: {
          include: { user: { select: { id: true, email: true, name: true } } },
        },
      },
    });
  }

  async addTeamOwner(
    leagueId: number,
    teamId: number,
    data: { userId?: number; email?: string; ownerName?: string },
  ) {
    const { userId: userIdRaw, email: emailRaw, ownerName } = data;

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { ownerships: true },
    });
    if (!team || team.leagueId !== leagueId) throw new Error("Team not found");

    if (team.ownerships.length >= 2)
      throw new Error("Team already has 2 owners. Remove one first.");

    let userId: number;

    if (userIdRaw) {
      userId = userIdRaw;
    } else if (emailRaw) {
      const u = await prisma.user.findUnique({
        where: { email: emailRaw.toLowerCase().trim() },
      });
      if (!u) throw new Error("User not found by email");
      userId = u.id;
    } else {
      throw new Error("Provide userId or email");
    }

    // Check existing
    if (team.ownerships.some((o) => o.userId === userId)) {
      throw new Error("User is already an owner of this team");
    }

    // Ensure membership
    await prisma.leagueMembership.upsert({
      where: { leagueId_userId: { leagueId, userId } },
      create: { leagueId, userId, role: "OWNER" },
      update: {}, // don't downgrade/upgrade implicitly? Or ensure at least OWNER?
    });
    // Legacy code forced "OWNER". Let's stick to safe upsert.

    await prisma.teamOwnership.create({
      data: { teamId, userId },
    });

    // Update legacy fields if first owner
    if (team.ownerships.length === 0) {
      await prisma.team.update({
        where: { id: teamId },
        data: {
          ownerUserId: userId,
          owner: ownerName || undefined,
        },
      });
    }

    return this.getTeam(teamId);
  }

  async removeTeamOwner(leagueId: number, teamId: number, userId: number) {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team || team.leagueId !== leagueId) throw new Error("Team not found");

    await prisma.teamOwnership.deleteMany({ where: { teamId, userId } });

    // Clean up legacy if needed
    if (team.ownerUserId === userId) {
      const nextOwner = await prisma.teamOwnership.findFirst({
        where: { teamId },
        include: { user: true },
      });
      await prisma.team.update({
        where: { id: teamId },
        data: {
          ownerUserId: nextOwner?.userId || null,
          owner: nextOwner?.user?.name || null,
        },
      });
    }

    return this.getTeam(teamId);
  }

  private async getTeam(teamId: number) {
    return prisma.team.findUnique({
      where: { id: teamId },
      include: {
        ownerUser: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            isAdmin: true,
          },
        },
        ownerships: {
          include: { user: { select: { id: true, email: true, name: true } } },
        },
      },
    });
  }

  /**
   * Roster / Player Operations
   */
  async assignPlayer(
    leagueId: number,
    data: {
      teamId: number;
      mlbId?: number;
      name: string;
      posPrimary: string;
      posList?: string;
      price?: number;
      source?: string;
    },
  ) {
    const {
      teamId,
      mlbId,
      name,
      posPrimary,
      posList,
      price = 1,
      source = "manual",
    } = data;

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team || team.leagueId !== leagueId)
      throw new Error("Team not found in this league");

    // 1. Resolve Player
    let player = mlbId
      ? await prisma.player.findFirst({ where: { mlbId } })
      : null;
    if (!player) {
      player = await prisma.player.findFirst({
        where: { name: normStr(name), posPrimary: normStr(posPrimary) },
      });
    }

    if (!player) {
      player = await prisma.player.create({
        data: {
          mlbId,
          name: normStr(name),
          posPrimary: normStr(posPrimary),
          posList: normStr(posList) || normStr(posPrimary),
        },
      });
    } else {
      // Refresh player data non-destructively
      player = await prisma.player.update({
        where: { id: player.id },
        data: {
          mlbId: mlbId ?? player.mlbId ?? undefined,
          posList: posList ? normStr(posList) : undefined,
        },
      });
    }

    // 2. Release from any other active roster
    await prisma.roster.updateMany({
      where: { playerId: player.id, releasedAt: null },
      data: { releasedAt: new Date() },
    });

    // 3. Create Roster Entry
    return await prisma.roster.create({
      data: {
        teamId,
        playerId: player.id,
        source,
        price: Number(price),
      },
      include: {
        player: true,
      },
    });
  }

  async releasePlayer(
    leagueId: number,
    data: { rosterId?: number; teamId?: number; playerId?: number },
  ) {
    const { rosterId, teamId, playerId } = data;

    if (rosterId) {
      const r = await prisma.roster.findUnique({
        where: { id: rosterId },
        include: { team: true },
      });
      if (!r || r.team.leagueId !== leagueId)
        throw new Error("Roster item not found in league");

      return await prisma.roster.update({
        where: { id: rosterId },
        data: { releasedAt: new Date() },
      });
    }

    if (teamId && playerId) {
      // verify team in league
      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (!team || team.leagueId !== leagueId)
        throw new Error("Team not found");

      await prisma.roster.updateMany({
        where: { teamId, playerId, releasedAt: null },
        data: { releasedAt: new Date() },
      });
      return { success: true };
    }

    throw new Error("Invalid release params");
  }

  async importRosters(leagueId: number, csvContent: string) {
    return auctionImportService.importRostersFromCsv(leagueId, csvContent);
  }

  /**
   * Rules Management
   */
  async getRules(leagueId: number) {
      let rules = await prisma.leagueRule.findMany({
          where: { leagueId },
          orderBy: [{ category: "asc" }, { key: "asc" }],
      });

      // If no rules exist, create defaults
      if (rules.length === 0) {
        await prisma.leagueRule.createMany({
          data: DEFAULT_RULES.map((r) => ({ ...r, leagueId })),
        });
        rules = await prisma.leagueRule.findMany({
          where: { leagueId },
          orderBy: [{ category: "asc" }, { key: "asc" }],
        });
      }
      return rules;
  }

  async updateRules(leagueId: number, updates: { id: number; value: string }[]) {
       // Check if rules are locked
      const lockedRule = await prisma.leagueRule.findFirst({
        where: { leagueId, isLocked: true },
      });

      if (lockedRule) {
        throw new Error("Rules are locked for this season");
      }

      const results = await Promise.all(
        updates.map((u) =>
          prisma.leagueRule.update({
            where: { id: u.id },
            data: { value: u.value },
          })
        )
      );
      return results.length;
  }

  async lockRules(leagueId: number) {
      await prisma.leagueRule.updateMany({
        where: { leagueId },
        data: { isLocked: true },
      });
      return true;
  }

  async unlockRules(leagueId: number) {
      await prisma.leagueRule.updateMany({
        where: { leagueId },
        data: { isLocked: false },
      });
      return true;
  }
}
