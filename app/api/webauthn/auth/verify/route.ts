import { prisma } from "@/lib/prisma";
import { verifyAuthenticationResponse, type AuthenticatorTransportFuture } from "@simplewebauthn/server";
import { RP_ID, ORIGIN, challengeFromResponse, consumeChallenge } from "@/lib/webauthn";
import { encode } from "next-auth/jwt";
import { cookies } from "next/headers";

const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.response?.id) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const credentialId: string = body.response.id;

  const stored = await prisma.webAuthnCredential.findUnique({
    where: { credentialId },
    include: { user: true },
  });
  if (!stored || stored.user.isGuest) {
    return Response.json({ error: "Credential not found" }, { status: 400 });
  }

  const signedChallenge = challengeFromResponse(body.response);
  const challengeRecord = signedChallenge
    ? await consumeChallenge(signedChallenge, "authentication", stored.userId, true)
    : null;
  if (!challengeRecord) {
    return Response.json({ error: "Challenge expired or not found" }, { status: 400 });
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: challengeRecord.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: stored.credentialId,
        publicKey: new Uint8Array(stored.publicKey),
        counter: Number(stored.counter),
        transports: stored.transports as AuthenticatorTransportFuture[],
      },
      requireUserVerification: true,
    });
  } catch {
    return Response.json({ error: "Verification failed" }, { status: 400 });
  }

  if (!verification.verified) {
    return Response.json({ error: "Not verified" }, { status: 400 });
  }

  await prisma.webAuthnCredential.update({
    where: { credentialId },
    data: {
      counter: BigInt(verification.authenticationInfo.newCounter),
      lastUsedAt: new Date(),
    },
  });

  const isSecure = ORIGIN.startsWith("https://");
  const cookieName = isSecure
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

  const { user } = stored;

  const token = await encode({
    token: {
      sub: user.id,
      name: user.name,
      email: user.email,
      picture: user.avatarUrl ?? undefined,
      username: user.username,
      loginMethod: "webauthn",
    },
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET!,
    salt: cookieName,
    maxAge: SESSION_MAX_AGE,
  });

  const cookieStore = await cookies();
  cookieStore.set(cookieName, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return Response.json({ ok: true, redirectTo: "/dashboard" });
}
