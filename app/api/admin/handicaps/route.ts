import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAdminAction, requireAdmin } from "@/lib/permissions";
import { rebuildHandicaps } from "@/lib/handicapRebuild";
import { recalcHandicap, updateHandicapIndex } from "@/lib/recalcHandicap";

const Schema = z.object({
  /** recalculate: from stored differentials. rebuild: recompute every round's differential first. */
  mode: z.enum(["recalculate", "rebuild"]),
  /** Omit for everyone */
  userId: z.string().min(1).optional(),
  dryRun: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if ("response" in admin) return admin.response;

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { mode, userId, dryRun } = parsed.data;

  let member: { name: string } | null = null;
  if (userId) {
    member = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    if (!member) return Response.json({ error: "Member not found" }, { status: 404 });
  }

  let result;
  if (mode === "rebuild") {
    result = await rebuildHandicaps({ userId, dryRun });
  } else {
    const users = await prisma.user.findMany({
      where: userId ? { id: userId } : {},
      select: { id: true, name: true, isGuest: true, handicapIndex: true },
      orderBy: { name: "asc" },
    });
    const changes = [];
    for (const u of users) {
      const after = dryRun ? await recalcHandicap(u.id) : await updateHandicapIndex(u.id);
      changes.push({ userId: u.id, name: u.name, isGuest: u.isGuest, before: u.handicapIndex, after });
    }
    result = { dryRun, roundsRebuilt: 0, changes };
  }

  if (!dryRun) {
    const changed = result.changes.filter((c) => c.after !== null && c.after !== c.before).length;
    await logAdminAction(
      admin.userId,
      `handicap.${mode}`,
      { type: "handicap", id: userId ?? null },
      `${mode === "rebuild" ? "Rebuilt" : "Recalculated"} handicaps for ${member?.name ?? "everyone"} — ${changed} changed`
    );
  }
  return Response.json(result);
}
