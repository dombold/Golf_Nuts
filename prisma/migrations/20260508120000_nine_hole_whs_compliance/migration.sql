-- Add isNineHole flag and enforce referential integrity on HandicapHistory

-- Clean up any orphaned history rows before adding the FK constraint
DELETE FROM handicap_history
WHERE "roundId" IS NOT NULL
  AND "roundId" NOT IN (SELECT id FROM rounds);

-- Add the 9-hole flag
ALTER TABLE "handicap_history" ADD COLUMN "isNineHole" BOOLEAN NOT NULL DEFAULT false;

-- Add FK with cascade delete so deleting a round removes its history rows
ALTER TABLE "handicap_history"
  ADD CONSTRAINT "handicap_history_roundId_fkey"
  FOREIGN KEY ("roundId") REFERENCES "rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
