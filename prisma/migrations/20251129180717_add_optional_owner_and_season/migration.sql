/*
  Warnings:

  - The primary key for the `Player` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `posList` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `posPrimary` on the `Player` table. All the data in the column will be lost.
  - The primary key for the `Team` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `budget` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `owner` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the `AuctionBid` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AuctionLot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FinanceLedger` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `League` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Period` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Roster` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TeamStatsPeriod` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TeamStatsSeason` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `mlbTeam` to the `Player` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "AuctionLot" DROP CONSTRAINT "AuctionLot_playerId_fkey";

-- DropForeignKey
ALTER TABLE "FinanceLedger" DROP CONSTRAINT "FinanceLedger_teamId_fkey";

-- DropForeignKey
ALTER TABLE "Roster" DROP CONSTRAINT "Roster_playerId_fkey";

-- DropForeignKey
ALTER TABLE "Roster" DROP CONSTRAINT "Roster_teamId_fkey";

-- DropForeignKey
ALTER TABLE "Team" DROP CONSTRAINT "Team_leagueId_fkey";

-- DropForeignKey
ALTER TABLE "TeamStatsPeriod" DROP CONSTRAINT "TeamStatsPeriod_periodId_fkey";

-- DropForeignKey
ALTER TABLE "TeamStatsPeriod" DROP CONSTRAINT "TeamStatsPeriod_teamId_fkey";

-- DropForeignKey
ALTER TABLE "TeamStatsSeason" DROP CONSTRAINT "TeamStatsSeason_teamId_fkey";

-- DropIndex
DROP INDEX "Team_leagueId_name_key";

-- AlterTable
ALTER TABLE "Player" DROP CONSTRAINT "Player_pkey",
DROP COLUMN "createdAt",
DROP COLUMN "posList",
DROP COLUMN "posPrimary",
ADD COLUMN     "bats" TEXT,
ADD COLUMN     "eligiblePositions" TEXT[],
ADD COLUMN     "mlbTeam" TEXT NOT NULL,
ADD COLUMN     "primaryPositions" TEXT[],
ADD COLUMN     "throws" TEXT,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Player_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Player_id_seq";

-- AlterTable
ALTER TABLE "Team" DROP CONSTRAINT "Team_pkey",
DROP COLUMN "budget",
DROP COLUMN "createdAt",
DROP COLUMN "owner",
ADD COLUMN     "losses" INTEGER,
ADD COLUMN     "ownerName" TEXT,
ADD COLUMN     "points" DOUBLE PRECISION,
ADD COLUMN     "season" INTEGER,
ADD COLUMN     "standingsRank" INTEGER,
ADD COLUMN     "ties" INTEGER,
ADD COLUMN     "wins" INTEGER,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "leagueId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Team_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Team_id_seq";

-- DropTable
DROP TABLE "AuctionBid";

-- DropTable
DROP TABLE "AuctionLot";

-- DropTable
DROP TABLE "FinanceLedger";

-- DropTable
DROP TABLE "League";

-- DropTable
DROP TABLE "Period";

-- DropTable
DROP TABLE "Roster";

-- DropTable
DROP TABLE "TeamStatsPeriod";

-- DropTable
DROP TABLE "TeamStatsSeason";

-- DropEnum
DROP TYPE "DraftMode";

-- DropEnum
DROP TYPE "DraftOrder";

-- CreateTable
CREATE TABLE "TeamRosterSlot" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "playerId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "isHitter" BOOLEAN NOT NULL,
    "isPitcher" BOOLEAN NOT NULL,
    "salary" INTEGER,
    "contractType" TEXT,
    "contractYear" INTEGER,

    CONSTRAINT "TeamRosterSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerSeasonPositionalGames" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "position" TEXT NOT NULL,
    "gamesPlayed" INTEGER NOT NULL,

    CONSTRAINT "PlayerSeasonPositionalGames_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamSeasonCategoryTotals" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "scoringPeriodType" TEXT NOT NULL,
    "scoringPeriodStart" TIMESTAMP(3),
    "scoringPeriodEnd" TIMESTAMP(3),
    "category" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "leagueRank" INTEGER,
    "leagueAverage" DOUBLE PRECISION,

    CONSTRAINT "TeamSeasonCategoryTotals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamRosterSlot_teamId_season_idx" ON "TeamRosterSlot"("teamId", "season");

-- CreateIndex
CREATE INDEX "TeamRosterSlot_playerId_season_idx" ON "TeamRosterSlot"("playerId", "season");

-- CreateIndex
CREATE INDEX "PlayerSeasonPositionalGames_playerId_season_idx" ON "PlayerSeasonPositionalGames"("playerId", "season");

-- CreateIndex
CREATE INDEX "TeamSeasonCategoryTotals_teamId_season_idx" ON "TeamSeasonCategoryTotals"("teamId", "season");

-- CreateIndex
CREATE INDEX "TeamSeasonCategoryTotals_season_category_idx" ON "TeamSeasonCategoryTotals"("season", "category");

-- CreateIndex
CREATE INDEX "Team_leagueId_season_idx" ON "Team"("leagueId", "season");

-- AddForeignKey
ALTER TABLE "TeamRosterSlot" ADD CONSTRAINT "TeamRosterSlot_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamRosterSlot" ADD CONSTRAINT "TeamRosterSlot_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSeasonPositionalGames" ADD CONSTRAINT "PlayerSeasonPositionalGames_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamSeasonCategoryTotals" ADD CONSTRAINT "TeamSeasonCategoryTotals_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
