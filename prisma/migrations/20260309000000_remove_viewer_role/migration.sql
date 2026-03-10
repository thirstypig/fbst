-- Convert existing VIEWER memberships to OWNER
UPDATE "LeagueMembership" SET "role" = 'OWNER' WHERE "role" = 'VIEWER';

-- Remove VIEWER from the LeagueRole enum
ALTER TYPE "LeagueRole" RENAME TO "LeagueRole_old";
CREATE TYPE "LeagueRole" AS ENUM ('COMMISSIONER', 'OWNER');
ALTER TABLE "LeagueMembership" ALTER COLUMN "role" TYPE "LeagueRole" USING ("role"::text::"LeagueRole");
DROP TYPE "LeagueRole_old";
