import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

const RESET_TTL_MS = 60 * 60 * 1000;

/**
 * Issue a one-hour password reset link for a member (replacing any earlier one) and email it.
 * Returns the link and whether the email was sent — email failures are logged, not thrown.
 */
export async function issuePasswordReset(user: { id: string; email: string }): Promise<{ resetUrl: string; emailed: boolean }> {
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  const plaintext = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(plaintext).digest("hex");
  await prisma.passwordResetToken.create({
    data: { tokenHash, email: user.email, userId: user.id, expiresAt: new Date(Date.now() + RESET_TTL_MS) },
  });

  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password/${plaintext}`;
  try {
    await sendPasswordResetEmail(user.email, resetUrl);
    return { resetUrl, emailed: true };
  } catch (err) {
    console.error("[password-reset] email send failed:", err);
    return { resetUrl, emailed: false };
  }
}
