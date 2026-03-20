-- CreateTable
CREATE TABLE "PlayerValue" (
    "id" SERIAL NOT NULL,
    "leagueId" INTEGER NOT NULL,
    "playerId" INTEGER,
    "mlbId" INTEGER,
    "playerName" TEXT NOT NULL,
    "position" TEXT,
    "value" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'upload',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlayerValue_leagueId_idx" ON "PlayerValue"("leagueId");

-- CreateIndex
CREATE INDEX "PlayerValue_playerId_idx" ON "PlayerValue"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerValue_leagueId_playerName_key" ON "PlayerValue"("leagueId", "playerName");

-- AddForeignKey
ALTER TABLE "PlayerValue" ADD CONSTRAINT "PlayerValue_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerValue" ADD CONSTRAINT "PlayerValue_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
