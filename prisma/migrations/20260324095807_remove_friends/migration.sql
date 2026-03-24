/*
  Warnings:

  - You are about to drop the `friends` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "friends" DROP CONSTRAINT "friends_addresseeId_fkey";

-- DropForeignKey
ALTER TABLE "friends" DROP CONSTRAINT "friends_requesterId_fkey";

-- DropTable
DROP TABLE "friends";

-- DropEnum
DROP TYPE "FriendStatus";
