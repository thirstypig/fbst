-- CreateEnum
CREATE TYPE "DraftMode" AS ENUM ('AUCTION', 'DRAFT');

-- CreateEnum
CREATE TYPE "DraftOrder" AS ENUM ('SNAKE', 'LINEAR');

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
CREATE TABLE "Team" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "owner" TEXT,
    "budget" INTEGER NOT NULL DEFAULT 400,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" SERIAL NOT NULL,
    "mlbId" INTEGER,
    "name" TEXT NOT NULL,
    "posPrimary" TEXT NOT NULL,
    "posList" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Period_name_key" ON "Period"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TeamStatsPeriod_teamId_periodId_key" ON "TeamStatsPeriod"("teamId", "periodId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamStatsSeason_teamId_key" ON "TeamStatsSeason"("teamId");

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
