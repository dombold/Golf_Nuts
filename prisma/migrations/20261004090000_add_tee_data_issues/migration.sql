-- Incomplete scorecard data: tees flag what is missing/estimated, and players can send
-- the administrator a copy of the scorecard. Rounds on flagged tees never count for handicaps.
CREATE TYPE "TeeDataIssue" AS ENUM ('STROKE_INDEX', 'RATING', 'HOLE_LENGTHS');

CREATE TYPE "ScorecardStatus" AS ENUM ('PENDING', 'REVIEWED');

ALTER TABLE "tees" ADD COLUMN "dataIssues" "TeeDataIssue"[] DEFAULT ARRAY[]::"TeeDataIssue"[];

CREATE TABLE "scorecard_submissions" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "teeId" TEXT,
    "userId" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "note" TEXT,
    "status" "ScorecardStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,

    CONSTRAINT "scorecard_submissions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "scorecard_submissions_status_createdAt_idx" ON "scorecard_submissions"("status", "createdAt");

CREATE INDEX "scorecard_submissions_userId_status_idx" ON "scorecard_submissions"("userId", "status");

ALTER TABLE "scorecard_submissions" ADD CONSTRAINT "scorecard_submissions_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "scorecard_submissions" ADD CONSTRAINT "scorecard_submissions_teeId_fkey" FOREIGN KEY ("teeId") REFERENCES "tees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "scorecard_submissions" ADD CONSTRAINT "scorecard_submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "scorecard_submissions" ADD CONSTRAINT "scorecard_submissions_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
