import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { RP_ID, ORIGIN } from "@/lib/webauthn";
import { isoBase64URL } from "@simplewebauthn/server/helpers";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request" }, { status: 400 });

  const challengeRecord = await prisma.webAuthnChallenge.findFirst({
    where: {
      userId: session.user.id,
      type: "registration",
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!challengeRecord) {
    return Response.json({ error: "Challenge expired or not found" }, { status: 400 });
  }

  await prisma.webAuthnChallenge.delete({ where: { id: challengeRecord.id } });

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: challengeRecord.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: true,
    });
  } catch {
    return Response.json({ error: "Verification failed" }, { status: 400 });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return Response.json({ error: "Not verified" }, { status: 400 });
  }

  const {
    credentialID,
    credentialPublicKey,
    counter,
    credentialDeviceType,
    credentialBackedUp,
  } = verification.registrationInfo;

  const name = typeof body.label === "string" ? body.label.slice(0, 50) : "Biometric";
  const transports: string[] = Array.isArray(body.response?.transports)
    ? body.response.transports
    : [];

  await prisma.webAuthnCredential.create({
    data: {
      userId: session.user.id,
      credentialId: isoBase64URL.fromBuffer(credentialID),
      publicKey: Buffer.from(credentialPublicKey),
      counter: BigInt(counter),
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports,
      name,
    },
  });

  return Response.json({ ok: true });
}
