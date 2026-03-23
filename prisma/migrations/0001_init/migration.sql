-- CreateEnum
CREATE TYPE "FriendStatus" AS ENUM ('PENDING', 'ACCEPTED');

-- CreateEnum
CREATE TYPE "GameFormat" AS ENUM ('STROKEPLAY', 'STABLEFORD', 'MATCH_PLAY', 'SKINS', 'AMBROSE_2', 'AMBROSE_4');

-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('SETUP', 'ACTIVE', 'COMPLETE');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'COMPLETE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "handicapIndex" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tees" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "rating" DOUBLE PRECISION NOT NULL,
    "slope" INTEGER NOT NULL,
    "par" INTEGER NOT NULL,

    CONSTRAINT "tees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holes" (
    "id" TEXT NOT NULL,
    "teeId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "par" INTEGER NOT NULL,
    "strokeIndex" INTEGER NOT NULL,
    "distance" INTEGER,

    CONSTRAINT "holes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rounds" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "teeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "format" "GameFormat" NOT NULL,
    "status" "RoundStatus" NOT NULL DEFAULT 'SETUP',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "round_players" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "playingHandicap" INTEGER NOT NULL DEFAULT 0,
    "teamColor" TEXT,
    "teamNumber" INTEGER,

    CONSTRAINT "round_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scores" (
    "id" TEXT NOT NULL,
    "roundPlayerId" TEXT NOT NULL,
    "holeNumber" INTEGER NOT NULL,
    "strokes" INTEGER NOT NULL,
    "penalties" INTEGER NOT NULL DEFAULT 0,
    "putts" INTEGER,
    "fairwayHit" BOOLEAN,
    "gir" BOOLEAN,

    CONSTRAINT "scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournaments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "format" "GameFormat" NOT NULL,
    "status" "TournamentStatus" NOT NULL DEFAULT 'UPCOMING',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_rounds" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,

    CONSTRAINT "tournament_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "handicap_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "index" DOUBLE PRECISION NOT NULL,
    "differential" DOUBLE PRECISION NOT NULL,
    "roundId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "handicap_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "friends" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "addresseeId" TEXT NOT NULL,
    "status" "FriendStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "friends_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "likes" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "courses_externalId_key" ON "courses"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "tees_courseId_name_key" ON "tees"("courseId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "holes_teeId_number_key" ON "holes"("teeId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "round_players_roundId_userId_key" ON "round_players"("roundId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "scores_roundPlayerId_holeNumber_key" ON "scores"("roundPlayerId", "holeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_rounds_tournamentId_roundNumber_key" ON "tournament_rounds"("tournamentId", "roundNumber");

-- CreateIndex
CREATE UNIQUE INDEX "friends_requesterId_addresseeId_key" ON "friends"("requesterId", "addresseeId");

-- CreateIndex
CREATE UNIQUE INDEX "likes_roundId_userId_key" ON "likes"("roundId", "userId");

-- AddForeignKey
ALTER TABLE "tees" ADD CONSTRAINT "tees_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holes" ADD CONSTRAINT "holes_teeId_fkey" FOREIGN KEY ("teeId") REFERENCES "tees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_teeId_fkey" FOREIGN KEY ("teeId") REFERENCES "tees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_players" ADD CONSTRAINT "round_players_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_players" ADD CONSTRAINT "round_players_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_roundPlayerId_fkey" FOREIGN KEY ("roundPlayerId") REFERENCES "round_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_rounds" ADD CONSTRAINT "tournament_rounds_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_rounds" ADD CONSTRAINT "tournament_rounds_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "rounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handicap_history" ADD CONSTRAINT "handicap_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friends" ADD CONSTRAINT "friends_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friends" ADD CONSTRAINT "friends_addresseeId_fkey" FOREIGN KEY ("addresseeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
