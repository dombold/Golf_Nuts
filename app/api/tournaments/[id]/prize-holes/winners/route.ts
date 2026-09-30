import { auth } from "@/lib/auth";
import { canOrganise, logTournamentAction } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

const PutSchema = z.object({
  winners: z.array(
    z.object({
      holeNumber: z.number().int().min(1).max(18),
      winnerId: z.string().nullable(),
    })
  ),
});

/** Record the Longest Drive / Nearest the Pin winner for each prize hole (organiser only). */
export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: {
      createdById: true,
      status: true,
      prizeHoles: { select: { holeNumber: true } },
      invitations: { where: { status: "ACCEPTED" }, select: { userId: true } },
    },
  });
  if (!tournament) return Response.json({ error: "Tournament not found" }, { status: 404 });
  if (!(await canOrganise(tournament.createdById, session.user.id))) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (tournament.status === "UPCOMING") {
    return Response.json({ error: "Prize winners can be recorded once the event has started" }, { status: 409 });
  }

  const body = await req.json();
  const parsed = PutSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const { winners } = parsed.data;
  const prizeHoleNumbers = new Set(tournament.prizeHoles.map((ph) => ph.holeNumber));
  const playerIds = new Set(tournament.invitations.map((inv) => inv.userId));

  if (winners.some((w) => !prizeHoleNumbers.has(w.holeNumber))) {
    return Response.json({ error: { message: "Not a prize hole for this event" } }, { status: 400 });
  }
  if (winners.some((w) => w.winnerId !== null && !playerIds.has(w.winnerId))) {
    return Response.json({ error: { message: "Winner must be a player in this event" } }, { status: 400 });
  }

  await prisma.$transaction(
    winners.map((w) =>
      prisma.tournamentPrizeHole.update({
        where: { tournamentId_holeNumber: { tournamentId: id, holeNumber: w.holeNumber } },
        data: { winnerId: w.winnerId },
      })
    )
  );

  const prizeHoles = await prisma.tournamentPrizeHole.findMany({
    where: { tournamentId: id },
    select: { holeNumber: true, type: true, winnerId: true, winner: { select: { name: true } } },
    orderBy: { holeNumber: "asc" },
  });

  await logTournamentAction(session.user.id, "tournament.prizeWinners", { id, createdById: tournament.createdById }, "Recorded prize winners");
  return Response.json({ prizeHoles });
}
