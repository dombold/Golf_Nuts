import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAdminAction, requireAdmin } from "@/lib/permissions";
import { issuePasswordReset } from "@/lib/passwordReset";

type Ctx = { params: Promise<{ id: string }> };

/** Admin sends a member a password reset link, and gets the link back to pass on if the email doesn't arrive. */
export async function POST(_req: NextRequest, { params }: Ctx) {
  const admin = await requireAdmin();
  if ("response" in admin) return admin.response;

  const { id } = await params;
  const member = await prisma.user.findUnique({ where: { id }, select: { name: true, email: true, isGuest: true } });
  if (!member || member.isGuest) return Response.json({ error: "Member not found" }, { status: 404 });

  const { resetUrl, emailed } = await issuePasswordReset({ id, email: member.email });
  await logAdminAction(admin.userId, "user.passwordReset", { type: "user", id }, `Sent ${member.name} a password reset link`);
  return Response.json({ resetUrl, emailed });
}
