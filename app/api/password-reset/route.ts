import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import crypto from "crypto";
import { z } from "zod";

const Schema = z.object({ email: z.email() });

const OK = Response.json({ ok: true });

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return OK;

  const { email } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return OK;

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  const plaintext = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(plaintext).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: { tokenHash, email, userId: user.id, expiresAt },
  });

  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password/${plaintext}`;

  try {
    await sendPasswordResetEmail(email, resetUrl);
  } catch (err) {
    console.error("[password-reset] email send failed:", err);
  }

  return OK;
}
