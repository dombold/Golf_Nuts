import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcPlayingHandicap } from "@/lib/handicap";
import { NextRequest } from "next/server";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: tournamentId } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      groups: {
        include: {
          tee: true,
          members: {
            include: { user: { select: { id: true, handicapIndex: true } } },
          },
        },
        orderBy: { groupNumber: "asc" },
      },
    },
  });

  if (!tournament) return Response.json({ error: "Tournament not found" }, { status: 404 });
  if (tournament.createdById !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (tournament.status !== "UPCOMING") {
    return Response.json({ error: "Tournament has already started" }, { status: 400 });
  }
  if (!tournament.courseId) {
    return Response.json({ error: "Tournament has no course assigned" }, { status: 400 });
  }
  if (tournament.groups.length === 0) {
    return Response.json({ error: "No groups have been arranged" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    for (const group of tournament.groups) {
      const tee = group.tee;

      // Create one round per group
      const round = await tx.round.create({
        data: {
          courseId: tournament.courseId!,
          teeId: tee.id,
          format: tournament.format,
          date: tournament.date ?? new Date(),
          status: "ACTIVE",
          players: {
            create: group.members.map((member) => ({
              userId: member.user.id,
              playingHandicap: calcPlayingHandicap(
                member.user.handicapIndex,
                tee.slope,
                tee.rating,
                tee.par
              ),
              teamNumber: member.teamNumber ?? null,
            })),
          },
        },
      });

      // Link round to tournament
      await tx.tournamentRound.create({
        data: {
          tournamentId,
          roundId: round.id,
          roundNumber: group.groupNumber,
        },
      });
    }

    // Activate the tournament
    await tx.tournament.update({
      where: { id: tournamentId },
      data: { status: "ACTIVE" },
    });
  });

  return Response.json({ success: true });
}
