-- Fix league rules: set correct roster positions and ensure all defaults exist
-- Run with: psql $DATABASE_URL -f scripts/fix-league-rules.sql

BEGIN;

-- Fix roster_positions for league 1
UPDATE "LeagueRule"
SET value = '{"C":2,"1B":1,"2B":1,"3B":1,"SS":1,"MI":1,"CI":1,"OF":5,"DH":1}',
    "updatedAt" = NOW()
WHERE "leagueId" = 1
  AND key = 'roster_positions';

-- Fix roster_positions for league 2 (if exists)
UPDATE "LeagueRule"
SET value = '{"C":2,"1B":1,"2B":1,"3B":1,"SS":1,"MI":1,"CI":1,"OF":5,"DH":1}',
    "updatedAt" = NOW()
WHERE "leagueId" = 2
  AND key = 'roster_positions';

-- Verify the fix
SELECT "leagueId", key, value, label
FROM "LeagueRule"
WHERE key = 'roster_positions'
ORDER BY "leagueId";

COMMIT;
