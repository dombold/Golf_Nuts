import { auth } from "@/lib/auth";
import { canOrganise, logTournamentAction } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { sendTournamentInviteNotification } from "@/lib/push";
import { NextRequest } from "next/server";
import { z } from "zod";

const InviteSchema = z.object({
  userId: z.string().min(1),
});

/** Organiser invites a registered player they missed at creation. They get a normal pending invite. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: tournamentId } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { createdById: true, status: true, name: true, inviteNote: true },
  });
  if (!tournament) return Response.json({ error: "Tournament not found" }, { status: 404 });
  if (!(await canOrganise(tournament.createdById, session.user.id))) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (tournament.status !== "UPCOMING") {
    return Response.json({ error: "Players can only be invited before the event starts" }, { status: 409 });
  }

  const parsed = InviteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Choose a player to invite" }, { status: 400 });
  const { userId } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isGuest: true } });
  if (!user || user.isGuest) return Response.json({ error: "That player isn't a registered member" }, { status: 400 });

  // skipDuplicates makes a double-submit (or an existing invite) a no-op rather than a unique-constraint error
  const { count } = await prisma.tournamentInvitation.createMany({
    data: [{ tournamentId, userId, status: "PENDING" }],
    skipDuplicates: true,
  });
  if (count === 0) return Response.json({ error: "That player has already been invited" }, { status: 409 });

  await logTournamentAction(session.user.id, "tournament.invite", { id: tournamentId, createdById: tournament.createdById }, "Invited a player");

  // Push is best-effort — never fail the invite over it
  void sendTournamentInviteNotification(userId, tournament.name, tournamentId, tournament.inviteNote).catch(() => {});

  return Response.json({ invitation: { userId, status: "PENDING" } }, { status: 201 });
}

const PatchSchema = z.object({
  status: z.enum(["ACCEPTED", "DECLINED"]),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: tournamentId } = await params;

  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const invitation = await prisma.tournamentInvitation.findUnique({
    where: { tournamentId_userId: { tournamentId, userId: session.user.id } },
    select: { id: true, tournament: { select: { status: true, createdById: true } } },
  });

  if (!invitation) return Response.json({ error: "Invitation not found" }, { status: 404 });
  if (invitation.tournament.status !== "UPCOMING") {
    return Response.json({ error: "The event has already started" }, { status: 409 });
  }
  if (invitation.tournament.createdById === session.user.id && parsed.data.status === "DECLINED") {
    return Response.json({ error: "The organiser can't decline their own event" }, { status: 400 });
  }

  const updated = await prisma.tournamentInvitation.update({
    where: { id: invitation.id },
    data: { status: parsed.data.status },
  });

  return Response.json({ invitation: updated });
}
