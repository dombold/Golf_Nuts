-- AlterTable
ALTER TABLE "tournaments" ADD COLUMN "completedAt" TIMESTAMP(3);

-- Backfill: events already complete are treated as finished on their scheduled date (or creation date)
UPDATE "tournaments" SET "completedAt" = COALESCE("date", "createdAt") WHERE "status" = 'COMPLETE';
