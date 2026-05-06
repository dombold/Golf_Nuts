import { prisma } from "@/lib/prisma";

export const RP_ID = process.env.WEBAUTHN_RP_ID ?? "golfnuts.dombold.com";
export const RP_NAME = "Golf Nuts";
export const ORIGIN = process.env.NEXTAUTH_URL ?? "https://golfnuts.dombold.com";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export async function saveChallenge(
  challenge: string,
  type: "registration" | "authentication",
  userId?: string
) {
  await prisma.webAuthnChallenge.create({
    data: {
      challenge,
      type,
      userId: userId ?? null,
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
    },
  });
}

export async function consumeChallengeById(id: string) {
  const record = await prisma.webAuthnChallenge.findUnique({ where: { id } });
  if (!record || record.expiresAt < new Date()) return null;
  await prisma.webAuthnChallenge.delete({ where: { id } });
  return record;
}

export async function pruneExpiredChallenges() {
  await prisma.webAuthnChallenge.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}
