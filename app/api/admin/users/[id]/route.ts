import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAdminAction, requireAdmin } from "@/lib/permissions";
import { MemberDetailsSchema } from "@/lib/memberSchema";

type Ctx = { params: Promise<{ id: string }> };

const AdminAccessSchema = z.object({ isAdmin: z.boolean() });

/** Admin edits a member's details, or grants / removes admin access. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const admin = await requireAdmin();
  if ("response" in admin) return admin.response;

  const { id } = await params;
  const member = await prisma.user.findUnique({
    where: { id },
    select: { name: true, username: true, email: true, isGuest: true, isAdmin: true },
  });
  if (!member || member.isGuest) return Response.json({ error: "Member not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  // Either the admin toggle, or the member's details (whose messages the form shows)
  const parsed =
    body && typeof body === "object" && "isAdmin" in body ? AdminAccessSchema.safeParse(body) : MemberDetailsSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const data = parsed.data;

  if ("isAdmin" in data) {
    if (data.isAdmin === member.isAdmin) return Response.json({ ok: true });
    if (!data.isAdmin) {
      if (id === admin.userId) return Response.json({ error: "You can't remove your own admin access" }, { status: 409 });
      const admins = await prisma.user.count({ where: { isAdmin: true } });
      if (admins <= 1) return Response.json({ error: "There must be at least one administrator" }, { status: 409 });
    }
    await prisma.user.update({ where: { id }, data: { isAdmin: data.isAdmin } });
    await logAdminAction(
      admin.userId,
      data.isAdmin ? "user.promote" : "user.demote",
      { type: "user", id },
      `${data.isAdmin ? "Made" : "Removed"} ${member.name} ${data.isAdmin ? "an administrator" : "as administrator"}`
    );
    return Response.json({ ok: true });
  }

  const [usernameTaken, emailTaken] = await Promise.all([
    prisma.user.findFirst({ where: { username: data.username, NOT: { id } }, select: { id: true } }),
    prisma.user.findFirst({ where: { email: data.email, NOT: { id } }, select: { id: true } }),
  ]);
  if (usernameTaken) return Response.json({ error: "Username already taken" }, { status: 409 });
  if (emailTaken) return Response.json({ error: "Email already in use" }, { status: 409 });

  const name = `${data.firstName} ${data.lastName}`;
  await prisma.user.update({
    where: { id },
    data: { username: data.username, firstName: data.firstName, lastName: data.lastName, name, email: data.email },
  });

  const changed = [
    member.name !== name && `name ${member.name} → ${name}`,
    member.username !== data.username && `username ${member.username} → ${data.username}`,
    member.email !== data.email && `email ${member.email} → ${data.email}`,
  ].filter(Boolean);
  if (changed.length > 0) {
    await logAdminAction(admin.userId, "user.edit", { type: "user", id, ownerId: id }, `Edited ${name}: ${changed.join(", ")}`);
  }
  return Response.json({ ok: true });
}
