// server/src/lib/rosterGuard.ts
// Shared guards: roster integrity checks

type PrismaLike = {
  roster: {
    findFirst: (args: any) => Promise<any>;
    count: (args: any) => Promise<number>;
  };
};

/**
 * Throws if the player is already on an active roster in this league.
 * Works with both the global `prisma` client and a transaction client (`tx`).
 */
export async function assertPlayerAvailable(
  tx: PrismaLike,
  playerId: number,
  leagueId: number,
): Promise<void> {
  const existing = await tx.roster.findFirst({
    where: {
      playerId,
      releasedAt: null,
      team: { leagueId },
    },
    include: {
      player: { select: { name: true } },
      team: { select: { name: true } },
    },
  });

  if (existing) {
    const playerName = existing.player?.name ?? `Player #${playerId}`;
    const teamName = existing.team?.name ?? `Team #${existing.teamId}`;
    throw new Error(
      `${playerName} is already on ${teamName}'s active roster in this league`,
    );
  }
}

/** Default roster limits (can be overridden by league rules) */
const DEFAULT_ROSTER_MAX = 23;

/**
 * Throws if adding a player would exceed the team's roster limit.
 * Accounts for an optional drop (if dropping a player, the net change is 0).
 */
export async function assertRosterLimit(
  tx: PrismaLike,
  teamId: number,
  isDroppingPlayer: boolean = false,
  maxRoster: number = DEFAULT_ROSTER_MAX,
): Promise<void> {
  const currentCount = await tx.roster.count({
    where: { teamId, releasedAt: null },
  });

  // If dropping a player in the same transaction, net change is 0
  const projectedCount = currentCount + 1 - (isDroppingPlayer ? 1 : 0);

  if (projectedCount > maxRoster) {
    throw new Error(
      `Roster limit exceeded: team has ${currentCount} players (max ${maxRoster}). ${isDroppingPlayer ? '' : 'You must drop a player to make room.'}`,
    );
  }
}
