-- Cleanup: Delete phantom UT players and test players, fix null mlbTeam
-- Run with: psql $DATABASE_URL -f scripts/cleanup-players.sql

BEGIN;

-- 1. Delete roster entries for phantom UT players (fabricated names)
DELETE FROM "Roster" WHERE "playerId" IN (
  SELECT id FROM "Player" WHERE "posPrimary" = 'UT' AND "mlbId" IS NULL
);

-- 2. Delete phantom UT players
DELETE FROM "Player" WHERE "posPrimary" = 'UT' AND "mlbId" IS NULL;

-- 3. Delete roster entries for test players (Verification Team = team 13)
DELETE FROM "Roster" WHERE "playerId" IN (
  SELECT id FROM "Player" WHERE name IN ('Player One', 'Player Two', 'Player Three')
);

-- 4. Delete test players
DELETE FROM "Player" WHERE name IN ('Player One', 'Player Two', 'Player Three');

-- 5. Fix null mlbTeam for real rostered players
UPDATE "Player" SET "mlbTeam" = 'ARI' WHERE name = 'Josh Bell' AND "mlbTeam" IS NULL;
UPDATE "Player" SET "mlbTeam" = 'SFG' WHERE name = 'Justin Verlander' AND "mlbTeam" IS NULL;
UPDATE "Player" SET "mlbTeam" = 'LAD' WHERE name = 'Clayton Kershaw' AND "mlbTeam" IS NULL;
UPDATE "Player" SET "mlbTeam" = 'STL' WHERE name = 'Sonny Gray' AND "mlbTeam" IS NULL;
UPDATE "Player" SET "mlbTeam" = 'NYM' WHERE name = 'Jeff McNeil' AND "mlbTeam" IS NULL;
UPDATE "Player" SET "mlbTeam" = 'PHI' WHERE name = 'Austin Hays' AND "mlbTeam" IS NULL;
UPDATE "Player" SET "mlbTeam" = 'BAL' WHERE name = 'Cedric Mullins' AND "mlbTeam" IS NULL;
UPDATE "Player" SET "mlbTeam" = 'NYM' WHERE name = 'Isiah Kiner-Falefa' AND "mlbTeam" IS NULL;
UPDATE "Player" SET "mlbTeam" = 'FA' WHERE name = 'Andrew McCutchen' AND "mlbTeam" IS NULL;
UPDATE "Player" SET "mlbTeam" = 'ARI' WHERE name = 'AJ Saalfrank' AND "mlbTeam" IS NULL;
UPDATE "Player" SET "mlbTeam" = 'PIT' WHERE name = 'Johan Oviedo' AND "mlbTeam" IS NULL;
UPDATE "Player" SET "mlbTeam" = 'CIN' WHERE name = 'Chase Durbin' AND "mlbTeam" IS NULL;
UPDATE "Player" SET "mlbTeam" = 'FA' WHERE name = 'Isaiah Collins' AND "mlbTeam" IS NULL;
UPDATE "Player" SET "mlbTeam" = 'FA' WHERE name = 'Jose Ferrer' AND "mlbTeam" IS NULL;
UPDATE "Player" SET "mlbTeam" = 'PIT' WHERE name = 'Nabil Crismatt' AND "mlbTeam" IS NULL;
UPDATE "Player" SET "mlbTeam" = 'SFG' WHERE name = 'Zack Littell' AND "mlbTeam" IS NULL;

COMMIT;

-- Verify
SELECT COUNT(*) AS remaining_null_mlbteam FROM "Player" WHERE "mlbTeam" IS NULL;
SELECT COUNT(*) AS total_players FROM "Player";
