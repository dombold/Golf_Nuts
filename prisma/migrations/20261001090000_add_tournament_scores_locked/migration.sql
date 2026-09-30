-- Organiser score lock: when set, players can no longer change the event's scores (the organiser still can).
ALTER TABLE "tournaments" ADD COLUMN "scoresLockedAt" TIMESTAMP(3);
