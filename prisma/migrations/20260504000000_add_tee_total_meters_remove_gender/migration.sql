-- AlterTable
ALTER TABLE "tees" DROP COLUMN IF EXISTS "gender",
ADD COLUMN "totalMeters" INTEGER;
