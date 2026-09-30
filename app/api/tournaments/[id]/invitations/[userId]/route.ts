import { auth } from "@/lib/auth";
import { canOrganise, logTournamentAction } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string; userId: string }> };

const PatchSchema = z.object({
  status: z.enum(["ACCEPTED", "DECLINED", "PENDING"]),
});

/** Organiser sets an invitee's status (e.g. they said "I'm in" in person). Upcoming events only. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: tournamentId, userId } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { createdById: true, status: true },
  });
  if (!tournament) return Response.json({ error: "Tournament not found" }, { status: 404 });
  if (!(await canOrganise(tournament.createdById, session.user.id))) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (tournament.status !== "UPCOMING") {
    return Response.json({ error: "The event has already started" }, { status: 409 });
  }
  if (userId === tournament.createdById) {
    return Response.json({ error: "The organiser is always playing" }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const { status } = parsed.data;

  const existing = await prisma.tournamentInvitation.findUnique({
    where: { tournamentId_userId: { tournamentId, userId } },
    select: { id: true, user: { select: { isGuest: true } } },
  });
  if (!existing) return Response.json({ error: "Invitation not found" }, { status: 404 });
  if (existing.user.isGuest) {
    return Response.json({ error: "Guests are always in — remove the guest instead" }, { status: 409 });
  }

  const invitation = await prisma.$transaction(async (tx) => {
    const updated = await tx.tournamentInvitation.update({
      where: { id: existing.id },
      data: { status },
      select: { userId: true, status: true },
    });

    // Only accepted players can be grouped (and /start builds rounds from saved groups),
    // so anyone moved out of Accepted leaves their group; drop any group left empty.
    if (status !== "ACCEPTED") {
      await tx.tournamentGroupMember.deleteMany({ where: { userId, group: { tournamentId } } });
      await tx.tournamentGroup.deleteMany({ where: { tournamentId, members: { none: {} } } });
    }
    return updated;
  });

  await logTournamentAction(session.user.id, "tournament.invitation", { id: tournamentId, createdById: tournament.createdById }, "Changed a player's invitation");
  return Response.json({ invitation });
}
