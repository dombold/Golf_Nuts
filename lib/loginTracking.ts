import { prisma } from "@/lib/prisma";

/**
 * Stamp the user's most recent sign-in. Raw SQL on purpose: a Prisma update would also bump
 * the @updatedAt column, making every sign-in look like a profile change on /admin/activity.
 * Never throws — a tracking failure must not block signing in.
 */
export async function recordLogin(userId: string) {
  try {
    await prisma.$executeRaw`UPDATE "users" SET "lastLoginAt" = (now() at time zone 'utc') WHERE "id" = ${userId}`;
  } catch (err) {
    console.error("recordLogin failed", err);
  }
}
