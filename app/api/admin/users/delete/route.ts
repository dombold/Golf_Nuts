import { NextRequest } from "next/server";
import { z } from "zod";
import { logAdminAction, requireAdmin } from "@/lib/permissions";
import { deleteMembers, memberDeletionImpact } from "@/lib/adminMembers";

const Schema = z.object({
  userIds: z.array(z.string().min(1)).min(1).max(50),
  /** true: only report what would be deleted */
  preview: z.boolean().default(false),
  /** Must be "DELETE" to go ahead */
  confirm: z.string().optional(),
});

/** Admin deletes one or more member accounts, with the events they organised and rounds only they played. */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if ("response" in admin) return admin.response;

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Choose at least one member" }, { status: 400 });
  const { userIds, preview, confirm } = parsed.data;

  if (preview) return Response.json({ impact: await memberDeletionImpact(userIds, admin.userId) });

  if (confirm !== "DELETE") return Response.json({ error: 'Type DELETE to confirm' }, { status: 400 });
  const impact = await memberDeletionImpact(userIds, admin.userId);
  if (impact.problems.length > 0) return Response.json({ error: impact.problems.join(". "), impact }, { status: 409 });

  await deleteMembers(userIds, admin.userId);
  await logAdminAction(
    admin.userId,
    "user.delete",
    { type: "user" },
    `Deleted ${impact.members.map((m) => `${m.name} (@${m.username})`).join(", ")} — ` +
      `${impact.events.length} event${impact.events.length === 1 ? "" : "s"}, ${impact.rounds} round${impact.rounds === 1 ? "" : "s"}`
  );
  return Response.json({ ok: true, impact });
}
