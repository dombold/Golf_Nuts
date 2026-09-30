-- Stableford: players per team (1 = individual, 2 or 4 = scramble teams). Existing Stableford stays individual.
ALTER TABLE "tournaments" ADD COLUMN "stablefordTeamSize" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "rounds" ADD COLUMN "stablefordTeamSize" INTEGER NOT NULL DEFAULT 1;
