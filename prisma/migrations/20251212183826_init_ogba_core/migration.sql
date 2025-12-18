/*
  Warnings:

  - The primary key for the `Player` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `bats` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `eligiblePositions` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `mlbTeam` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `primaryPositions` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `throws` on the `Player` table. All the data in the column will be lost.
  - The `id` column on the `Player` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Team` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `losses` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `ownerName` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `points` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `season` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `standingsRank` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `ties` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `wins` on the `Team` table. All the data in the column will be lost.
  - The `id` column on the `Team` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `PlayerSeasonPositionalGames` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TeamRosterSlot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TeamSeasonCategoryTotals` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[leagueId,name]` on the table `Team` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `posList` to the `Player` table without a default value. This is not possible if the table is not empty.
  - Added the required column `posPrimary` to the `Player` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `leagueId` on the `Team` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "DraftMode" AS ENUM ('AUCTION', 'DRAFT');

-- CreateEnum
CREATE TYPE "DraftOrder" AS ENUM ('SNAKE', 'LINEAR');

-- DropForeignKey
ALTER TABLE "PlayerSeasonPositionalGames" DROP CONSTRAINT "PlayerSeasonPositionalGames_playerId_fkey";

-- DropForeignKey
ALTER TABLE "TeamRosterSlot" DROP CONSTRAINT "TeamRosterSlot_playerId_fkey";

-- DropForeignKey
ALTER TABLE "TeamRosterSlot" DROP CONSTRAINT "TeamRosterSlot_teamId_fkey";

-- DropForeignKey
ALTER TABLE "TeamSeasonCategoryTotals" DROP CONSTRAINT "TeamSeasonCategoryTotals_teamId_fkey";

-- DropIndex
DROP INDEX "Team_leagueId_season_idx";

-- AlterTable
ALTER TABLE "Player" DROP CONSTRAINT "Player_pkey",
DROP COLUMN "bats",
DROP COLUMN "eligiblePositions",
DROP COLUMN "mlbTeam",
DROP COLUMN "primaryPositions",
DROP COLUMN "throws",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "posList" TEXT NOT NULL,
ADD COLUMN     "posPrimary" TEXT NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Player_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Team" DROP CONSTRAINT "Team_pkey",
DROP COLUMN "losses",
DROP COLUMN "ownerName",
DROP COLUMN "points",
DROP COLUMN "season",
DROP COLUMN "standingsRank",
DROP COLUMN "ties",
DROP COLUMN "wins",
ADD COLUMN     "budget" INTEGER NOT NULL DEFAULT 400,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "owner" TEXT,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "leagueId",
ADD COLUMN     "leagueId" INTEGER NOT NULL,
ADD CONSTRAINT "Team_pkey" PRIMARY KEY ("id");

-- DropTable
DROP TABLE "PlayerSeasonPositionalGames";

-- DropTable
DROP TABLE "TeamRosterSlot";

-- DropTable
DROP TABLE "TeamSeasonCategoryTotals";

-- CreateTable
CREATE TABLE "League" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "draftMode" "DraftMode" NOT NULL,
    "draftOrder" "DraftOrder",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Period" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "Period_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamStatsPeriod" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "periodId" INTEGER NOT NULL,
    "R" INTEGER NOT NULL DEFAULT 0,
    "HR" INTEGER NOT NULL DEFAULT 0,
    "RBI" INTEGER NOT NULL DEFAULT 0,
    "SB" INTEGER NOT NULL DEFAULT 0,
    "AVG" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "W" INTEGER NOT NULL DEFAULT 0,
    "S" INTEGER NOT NULL DEFAULT 0,
    "ERA" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "WHIP" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "K" INTEGER NOT NULL DEFAULT 0,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TeamStatsPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamStatsSeason" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "R" INTEGER NOT NULL DEFAULT 0,
    "HR" INTEGER NOT NULL DEFAULT 0,
    "RBI" INTEGER NOT NULL DEFAULT 0,
    "SB" INTEGER NOT NULL DEFAULT 0,
    "AVG" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "W" INTEGER NOT NULL DEFAULT 0,
    "S" INTEGER NOT NULL DEFAULT 0,
    "ERA" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "WHIP" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "K" INTEGER NOT NULL DEFAULT 0,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TeamStatsSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Roster" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),
    "source" TEXT NOT NULL,
    "price" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Roster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuctionLot" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "nominatingTeamId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "startTs" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTs" TIMESTAMP(3),
    "finalPrice" INTEGER,
    "winnerTeamId" INTEGER,

    CONSTRAINT "AuctionLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuctionBid" (
    "id" SERIAL NOT NULL,
    "lotId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuctionBid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceLedger" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "League_name_season_key" ON "League"("name", "season");

-- CreateIndex
CREATE UNIQUE INDEX "Period_name_key" ON "Period"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TeamStatsPeriod_teamId_periodId_key" ON "TeamStatsPeriod"("teamId", "periodId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamStatsSeason_teamId_key" ON "TeamStatsSeason"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_leagueId_name_key" ON "Team"("leagueId", "name");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamStatsPeriod" ADD CONSTRAINT "TeamStatsPeriod_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamStatsPeriod" ADD CONSTRAINT "TeamStatsPeriod_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamStatsSeason" ADD CONSTRAINT "TeamStatsSeason_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Roster" ADD CONSTRAINT "Roster_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Roster" ADD CONSTRAINT "Roster_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionLot" ADD CONSTRAINT "AuctionLot_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceLedger" ADD CONSTRAINT "FinanceLedger_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
