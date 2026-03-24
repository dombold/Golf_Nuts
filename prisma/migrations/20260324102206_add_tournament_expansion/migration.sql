/*
  Warnings:

  - You are about to drop the column `endDate` on the `tournaments` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `tournaments` table. All the data in the column will be lost.
  - Added the required column `createdById` to the `tournaments` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- AlterTable
ALTER TABLE "tournaments" DROP COLUMN "endDate",
DROP COLUMN "startDate",
ADD COLUMN     "courseId" TEXT,
ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "date" TIMESTAMP(3),
ADD COLUMN     "teeId" TEXT;

-- CreateTable
CREATE TABLE "tournament_invitations" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournament_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_groups" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "groupNumber" INTEGER NOT NULL,
    "teeId" TEXT NOT NULL,

    CONSTRAINT "tournament_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_group_members" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamNumber" INTEGER,

    CONSTRAINT "tournament_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tournament_invitations_tournamentId_userId_key" ON "tournament_invitations"("tournamentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_groups_tournamentId_groupNumber_key" ON "tournament_groups"("tournamentId", "groupNumber");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_group_members_groupId_userId_key" ON "tournament_group_members"("groupId", "userId");

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_teeId_fkey" FOREIGN KEY ("teeId") REFERENCES "tees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_invitations" ADD CONSTRAINT "tournament_invitations_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_invitations" ADD CONSTRAINT "tournament_invitations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_groups" ADD CONSTRAINT "tournament_groups_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_groups" ADD CONSTRAINT "tournament_groups_teeId_fkey" FOREIGN KEY ("teeId") REFERENCES "tees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_group_members" ADD CONSTRAINT "tournament_group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "tournament_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_group_members" ADD CONSTRAINT "tournament_group_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
