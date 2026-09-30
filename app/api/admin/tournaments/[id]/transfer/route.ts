import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAdminAction, requireAdmin } from "@/lib/permissions";

type Ctx = { params: Promise<{ id: string }> };

const Schema = z.object({ userId: z.string().min(1) });

/** Admin hands an event to a different organiser. Before it starts, the new organiser is added as playing. */
export async function POST(req: NextRequest, { params }: Ctx) {
  const admin = await requireAdmin();
  if ("response" in admin) return admin.response;

  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: { name: true, status: true, createdById: true, createdBy: { select: { name: true } } },
  });
  if (!tournament) return Response.json({ error: "Tournament not found" }, { status: 404 });

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Choose a member" }, { status: 400 });
  const { userId } = parsed.data;
  if (userId === tournament.createdById) {
    return Response.json({ error: `${tournament.createdBy.name} already organises this event` }, { status: 409 });
  }

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, isGuest: true } });
  if (!target || target.isGuest) return Response.json({ error: "Member not found" }, { status: 404 });

  await prisma.$transaction([
    prisma.tournament.update({ where: { id }, data: { createdById: userId } }),
    // The organiser always plays — only while the field can still change
    ...(tournament.status === "UPCOMING"
      ? [
          prisma.tournamentInvitation.upsert({
            where: { tournamentId_userId: { tournamentId: id, userId } },
            update: { status: "ACCEPTED" },
            create: { tournamentId: id, userId, status: "ACCEPTED" },
          }),
        ]
      : []),
  ]);

  await logAdminAction(
    admin.userId,
    "tournament.transfer",
    { type: "tournament", id },
    `Transferred ${tournament.name} from ${tournament.createdBy.name} to ${target.name}`
  );
  return Response.json({ ok: true });
}
