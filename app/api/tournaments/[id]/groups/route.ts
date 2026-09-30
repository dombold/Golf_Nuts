import { auth } from "@/lib/auth";
import { canOrganise, logTournamentAction } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { z } from "zod";

const PutSchema = z.object({
  groups: z.array(
    z.object({
      groupNumber: z.number().int().min(1),
      teeId: z.string(),
      members: z.array(
        z.object({
          userId: z.string(),
          teamNumber: z.number().int().min(1).max(8).optional(),
        })
      ).max(4),
    })
  ).max(50),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: tournamentId } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      createdById: true,
      status: true,
      courseId: true,
      invitations: { where: { status: "ACCEPTED" }, select: { userId: true } },
    },
  });
  if (!tournament) return Response.json({ error: "Tournament not found" }, { status: 404 });
  if (!(await canOrganise(tournament.createdById, session.user.id))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (tournament.status !== "UPCOMING") {
    return Response.json({ error: "Cannot modify groups after tournament has started" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = PutSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const { groups } = parsed.data;
  const bad = (message: string) => Response.json({ error: { message } }, { status: 400 });

  if (new Set(groups.map((g) => g.groupNumber)).size !== groups.length) {
    return bad("Group numbers must be unique");
  }
  const memberIds = groups.flatMap((g) => g.members.map((m) => m.userId));
  if (new Set(memberIds).size !== memberIds.length) {
    return bad("A player can only be in one group");
  }
  const acceptedIds = new Set(tournament.invitations.map((i) => i.userId));
  if (memberIds.some((uid) => !acceptedIds.has(uid))) {
    return bad("Only players who have accepted can be grouped");
  }
  const teeIds = [...new Set(groups.map((g) => g.teeId))];
  const validTees = await prisma.tee.count({
    where: { id: { in: teeIds }, courseId: tournament.courseId ?? undefined },
  });
  if (teeIds.length > 0 && (!tournament.courseId || validTees !== teeIds.length)) {
    return bad("Each group's tee must belong to the event's course");
  }

  // Replace all groups in a transaction
  await prisma.$transaction(async (tx) => {
    // Delete existing groups (cascades to members)
    await tx.tournamentGroup.deleteMany({ where: { tournamentId } });

    // Recreate from payload
    for (const group of groups) {
      await tx.tournamentGroup.create({
        data: {
          tournamentId,
          groupNumber: group.groupNumber,
          teeId: group.teeId,
          members: {
            create: group.members.map((m) => ({
              userId: m.userId,
              teamNumber: m.teamNumber ?? null,
            })),
          },
        },
      });
    }
  });

  await logTournamentAction(session.user.id, "tournament.groups", { id: tournamentId, createdById: tournament.createdById }, "Edited groups");
  return Response.json({ success: true });
}
