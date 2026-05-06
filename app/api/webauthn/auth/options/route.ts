import { prisma } from "@/lib/prisma";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { saveChallenge, RP_ID } from "@/lib/webauthn";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/types";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const usernameOrEmail = typeof body?.usernameOrEmail === "string" ? body.usernameOrEmail : "";

  let allowCredentials: { id: Uint8Array; type: "public-key"; transports: AuthenticatorTransportFuture[] }[] = [];
  let userId: string | undefined;

  if (usernameOrEmail) {
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: usernameOrEmail }, { username: usernameOrEmail }] },
      include: {
        webAuthnCredentials: { select: { credentialId: true, transports: true } },
      },
    });
    if (user) {
      userId = user.id;
      allowCredentials = user.webAuthnCredentials.map((c) => ({
        id: isoBase64URL.toBuffer(c.credentialId),
        type: "public-key" as const,
        transports: c.transports as AuthenticatorTransportFuture[],
      }));
    }
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: "preferred",
    allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
  });

  await saveChallenge(options.challenge, "authentication", userId);

  return Response.json(options);
}
