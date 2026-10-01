import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateRegistrationOptions, type AuthenticatorTransportFuture } from "@simplewebauthn/server";
import { isoUint8Array } from "@simplewebauthn/server/helpers";
import { saveChallenge, RP_ID, RP_NAME } from "@/lib/webauthn";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const existing = await prisma.webAuthnCredential.findMany({
    where: { userId },
    select: { credentialId: true, transports: true },
  });

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    // Same UTF-8 bytes v9 used for the user handle, so re-registering a device replaces its passkey
    userID: isoUint8Array.fromUTF8String(userId),
    userName: session.user.username,
    userDisplayName: session.user.name ?? session.user.username,
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({
      id: c.credentialId,
      transports: c.transports as AuthenticatorTransportFuture[],
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
      authenticatorAttachment: "platform",
    },
  });

  await saveChallenge(options.challenge, "registration", userId);

  return Response.json(options);
}
