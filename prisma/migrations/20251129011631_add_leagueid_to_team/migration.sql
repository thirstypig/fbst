/*
  Warnings:

  - A unique constraint covering the columns `[leagueId,name]` on the table `Team` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `leagueId` to the `Team` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Team_name_key";

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "leagueId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Team_leagueId_name_key" ON "Team"("leagueId", "name");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
