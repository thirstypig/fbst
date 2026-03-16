-- Make franchiseId NOT NULL (all existing rows populated by data migration)
ALTER TABLE "League" ALTER COLUMN "franchiseId" SET NOT NULL;

-- Fix FK cascade: SET NULL is invalid on a NOT NULL column, change to RESTRICT
ALTER TABLE "League" DROP CONSTRAINT "League_franchiseId_fkey";
ALTER TABLE "League" ADD CONSTRAINT "League_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
