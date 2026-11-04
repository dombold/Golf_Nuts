-- CreateTable
CREATE TABLE "tournament_polls" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_polls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_poll_options" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "tournament_poll_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_poll_votes" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournament_poll_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tournament_polls_tournamentId_idx" ON "tournament_polls"("tournamentId");

-- CreateIndex
CREATE INDEX "tournament_poll_options_pollId_idx" ON "tournament_poll_options"("pollId");

-- CreateIndex
CREATE INDEX "tournament_poll_votes_optionId_idx" ON "tournament_poll_votes"("optionId");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_poll_votes_pollId_userId_key" ON "tournament_poll_votes"("pollId", "userId");

-- AddForeignKey
ALTER TABLE "tournament_polls" ADD CONSTRAINT "tournament_polls_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_poll_options" ADD CONSTRAINT "tournament_poll_options_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "tournament_polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_poll_votes" ADD CONSTRAINT "tournament_poll_votes_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "tournament_polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_poll_votes" ADD CONSTRAINT "tournament_poll_votes_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "tournament_poll_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_poll_votes" ADD CONSTRAINT "tournament_poll_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_poll_votes" ADD CONSTRAINT "tournament_poll_votes_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
