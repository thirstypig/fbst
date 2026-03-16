-- CreateTable
CREATE TABLE "Franchise" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "publicSlug" TEXT,
    "inviteCode" TEXT,
    "tradeReviewPolicy" TEXT NOT NULL DEFAULT 'COMMISSIONER',
    "vetoThreshold" INTEGER NOT NULL DEFAULT 4,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Franchise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FranchiseMembership" (
    "id" SERIAL NOT NULL,
    "franchiseId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" "LeagueRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FranchiseMembership_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "League" ADD COLUMN "franchiseId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Franchise_name_key" ON "Franchise"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Franchise_publicSlug_key" ON "Franchise"("publicSlug");

-- CreateIndex
CREATE UNIQUE INDEX "Franchise_inviteCode_key" ON "Franchise"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "FranchiseMembership_franchiseId_userId_key" ON "FranchiseMembership"("franchiseId", "userId");

-- AddForeignKey
ALTER TABLE "FranchiseMembership" ADD CONSTRAINT "FranchiseMembership_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FranchiseMembership" ADD CONSTRAINT "FranchiseMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "League" ADD CONSTRAINT "League_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE SET NULL ON UPDATE CASCADE;
