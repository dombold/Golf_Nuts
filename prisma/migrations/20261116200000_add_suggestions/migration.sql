-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('OPEN', 'PLANNED', 'DONE', 'NOT_PLANNED');

-- CreateTable
CREATE TABLE "suggestions" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'OPEN',
    "doneVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suggestion_votes" (
    "id" TEXT NOT NULL,
    "suggestionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suggestion_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suggestion_comments" (
    "id" TEXT NOT NULL,
    "suggestionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suggestion_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "suggestions_authorId_idx" ON "suggestions"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "suggestion_votes_suggestionId_userId_key" ON "suggestion_votes"("suggestionId", "userId");

-- CreateIndex
CREATE INDEX "suggestion_comments_suggestionId_idx" ON "suggestion_comments"("suggestionId");

-- AddForeignKey
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggestion_votes" ADD CONSTRAINT "suggestion_votes_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "suggestions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggestion_votes" ADD CONSTRAINT "suggestion_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggestion_comments" ADD CONSTRAINT "suggestion_comments_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "suggestions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggestion_comments" ADD CONSTRAINT "suggestion_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

