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
  await pruneExpiredChallenges();
  await prisma.webAuthnChallenge.create({
    data: {
      challenge,
      type,
      userId: userId ?? null,
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
    },
  });
}

/** The challenge the browser actually signed, read from the response's clientDataJSON. */
export function challengeFromResponse(response: unknown): string | null {
  const encoded = (response as { response?: { clientDataJSON?: unknown } } | null)?.response?.clientDataJSON;
  if (typeof encoded !== "string") return null;
  try {
    const clientData = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    return typeof clientData?.challenge === "string" ? clientData.challenge : null;
  } catch {
    return null;
  }
}

/**
 * Look up and delete (single use) an unexpired challenge of the given type.
 * `userId` restricts it to that user's challenges (plus anonymous ones when `allowAnonymous`).
 */
export async function consumeChallenge(
  challenge: string,
  type: "registration" | "authentication",
  userId: string,
  allowAnonymous = false
) {
  const record = await prisma.webAuthnChallenge.findUnique({ where: { challenge } });
  if (!record) return null;
  await prisma.webAuthnChallenge.delete({ where: { id: record.id } });
  const ownerOk = record.userId === userId || (allowAnonymous && record.userId === null);
  if (record.type !== type || record.expiresAt < new Date() || !ownerOk) return null;
  return record;
}

export async function pruneExpiredChallenges() {
  await prisma.webAuthnChallenge.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}
