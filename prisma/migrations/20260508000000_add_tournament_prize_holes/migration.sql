-- CreateEnum
CREATE TYPE "PrizeHoleType" AS ENUM ('LONGEST_DRIVE', 'NEAREST_PIN');

-- CreateTable
CREATE TABLE "tournament_prize_holes" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "holeNumber" INTEGER NOT NULL,
    "type" "PrizeHoleType" NOT NULL,

    CONSTRAINT "tournament_prize_holes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tournament_prize_holes_tournamentId_holeNumber_key" ON "tournament_prize_holes"("tournamentId", "holeNumber");

-- AddForeignKey
ALTER TABLE "tournament_prize_holes" ADD CONSTRAINT "tournament_prize_holes_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
