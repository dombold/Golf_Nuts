-- AlterTable
ALTER TABLE "tournament_prize_holes" ADD COLUMN "winnerId" TEXT;

-- AddForeignKey
ALTER TABLE "tournament_prize_holes" ADD CONSTRAINT "tournament_prize_holes_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
