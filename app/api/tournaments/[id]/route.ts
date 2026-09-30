import { auth } from "@/lib/auth";
import { canOrganise, logTournamentAction } from "@/lib/permissions";
import { deleteTournamentWithRounds } from "@/lib/deleteTournament";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { z } from "zod";
import { GameFormatSchema } from "@/lib/gameFormats";
import { isHoleInPlay } from "@/lib/nines";
import { splitIntoTeams } from "@/lib/teams";
import { teamSizeFor } from "@/lib/gameFormats";
import { unfinishedGroupsMessage } from "@/lib/roundCompletion";

type Ctx = { params: Promise<{ id: string }> };

/** Group numbers whose round hasn't been finished (every card complete). */
async function unfinishedGroups(tournamentId: string): Promise<number[]> {
  const rounds = await prisma.tournamentRound.findMany({
    where: { tournamentId, round: { status: { not: "COMPLETE" } } },
    select: { roundNumber: true },
    orderBy: { roundNumber: "asc" },
  });
  return rounds.map((r) => r.roundNumber);
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, username: true } },
      course: { select: { id: true, name: true } },
      tee: { select: { id: true, name: true, rating: true, slope: true, par: true } },
      invitations: {
        include: { user: { select: { id: true, name: true, username: true, handicapIndex: true } } },
        orderBy: { createdAt: "asc" },
      },
      groups: {
        orderBy: { groupNumber: "asc" },
        include: {
          tee: { select: { id: true, name: true } },
          members: {
            include: { user: { select: { id: true, name: true, username: true, handicapIndex: true } } },
          },
        },
      },
      rounds: {
        orderBy: { roundNumber: "asc" },
        include: {
          round: {
            include: {
              course: { select: { name: true } },
              tee: {
                select: {
                  holes: {
                    select: { number: true, strokeIndex: true, par: true },
                    orderBy: { number: "asc" },
                  },
                },
              },
              players: {
                include: {
                  user: { select: { id: true, name: true, isGuest: true } },
                  scores: { select: { holeNumber: true, strokes: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!tournament) return Response.json({ error: "Tournament not found" }, { status: 404 });

  return Response.json({ tournament });
}

const PatchSchema = z.object({
  name: z.string().min(2).trim().optional(),
  format: GameFormatSchema.optional(),
  date: z.string().nullable().optional(),
  teeOffTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  courseId: z.string().nullable().optional(),
  teeId: z.string().nullable().optional(),
  holesCount: z.union([z.literal(9), z.literal(18)]).optional(),
  startingHole: z.union([z.literal(1), z.literal(10)]).optional(),
  status: z.enum(["UPCOMING", "ACTIVE", "COMPLETE"]).optional(),
  skinsCarryOver: z.boolean().optional(),
  stablefordTeamSize: z.union([z.literal(1), z.literal(2), z.literal(4)]).optional(),
});

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament) return Response.json({ error: "Tournament not found" }, { status: 404 });
  if (!(await canOrganise(tournament.createdById, session.user.id))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const { name, format, date, teeOffTime, courseId, teeId, holesCount, startingHole, status, skinsCarryOver, stablefordTeamSize } = parsed.data;

  const isFieldEdit = name !== undefined || format !== undefined || date !== undefined
    || teeOffTime !== undefined || courseId !== undefined || teeId !== undefined
    || holesCount !== undefined || startingHole !== undefined || skinsCarryOver !== undefined
    || stablefordTeamSize !== undefined;

  if (isFieldEdit && tournament.status !== "UPCOMING") {
    return Response.json(
      { error: "Event details can only be edited while the event is upcoming" },
      { status: 409 }
    );
  }

  // Starting goes through /start (which creates the rounds); after that the organiser may only
  // finish the event early or re-open a finished one.
  if (status !== undefined && status !== tournament.status) {
    const allowed =
      (tournament.status === "ACTIVE" && status === "COMPLETE") ||
      (tournament.status === "COMPLETE" && status === "ACTIVE");
    if (!allowed) {
      return Response.json(
        { error: `Can't change an ${tournament.status.toLowerCase()} event to ${status.toLowerCase()}` },
        { status: 409 }
      );
    }
    // Finishing early is only allowed once every group has a complete card
    if (status === "COMPLETE") {
      const unfinished = await unfinishedGroups(id);
      if (unfinished.length > 0) return Response.json({ error: unfinishedGroupsMessage(unfinished) }, { status: 409 });
    }
  }

  if (format === "MATCH_PLAY" && tournament.format !== "MATCH_PLAY") {
    return Response.json({ error: { message: "Match Play isn't available for events" } }, { status: 400 });
  }

  // The tee must belong to the event's course
  const newCourseId = courseId !== undefined ? courseId : tournament.courseId;
  const newTeeId = teeId !== undefined ? teeId : tournament.teeId;
  if (newTeeId) {
    const tee = await prisma.tee.findUnique({ where: { id: newTeeId }, select: { courseId: true } });
    if (!tee || tee.courseId !== newCourseId) {
      return Response.json({ error: { message: "That tee doesn't belong to the selected course" } }, { status: 400 });
    }
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (format !== undefined) data.format = format;
  if (date !== undefined) data.date = date ? new Date(date) : null;
  if (teeOffTime !== undefined) data.teeOffTime = teeOffTime;
  if (courseId !== undefined) data.courseId = courseId;
  if (teeId !== undefined) data.teeId = teeId;
  if (skinsCarryOver !== undefined) data.skinsCarryOver = skinsCarryOver;
  if (stablefordTeamSize !== undefined) data.stablefordTeamSize = stablefordTeamSize;
  if (status !== undefined && status !== tournament.status) {
    data.status = status;
    // Record when the event finished (drives the move to Previous Events); clear it if re-opened
    data.completedAt = status === "COMPLETE" ? new Date() : null;
    // A re-opened event is back in play — any score lock no longer applies
    if (status === "ACTIVE") data.scoresLockedAt = null;
  }

  const newHolesCount = holesCount ?? tournament.holesCount;
  const newStartingHole = newHolesCount === 18 ? 1 : (startingHole ?? tournament.startingHole);
  if (holesCount !== undefined || startingHole !== undefined) {
    data.holesCount = newHolesCount;
    data.startingHole = newStartingHole;
  }

  const updated = await prisma.$transaction(async (tx) => {
    // If the course or tee changes, prize holes are no longer valid — clear them
    const courseChanged = courseId !== undefined && courseId !== tournament.courseId;
    const teeChanged = teeId !== undefined && teeId !== tournament.teeId;
    if (courseChanged || teeChanged) {
      await tx.tournamentPrizeHole.deleteMany({ where: { tournamentId: id } });
    } else if (newHolesCount !== tournament.holesCount || newStartingHole !== tournament.startingHole) {
      // Drop prize holes that fall outside the newly selected nine(s)
      const existing = await tx.tournamentPrizeHole.findMany({ where: { tournamentId: id } });
      const outOfPlay = existing.filter((ph) => !isHoleInPlay(ph.holeNumber, newHolesCount, newStartingHole));
      if (outOfPlay.length > 0) {
        await tx.tournamentPrizeHole.deleteMany({ where: { id: { in: outOfPlay.map((ph) => ph.id) } } });
      }
    }
    // Changing the team size (format, or Stableford 2-ball / 4-ball) invalidates saved team numbers:
    // team games get fresh handicap-balanced teams, individual games clear them
    const oldTeamSize = teamSizeFor(tournament.format, tournament.stablefordTeamSize);
    const newTeamSize = teamSizeFor(format ?? tournament.format, stablefordTeamSize ?? tournament.stablefordTeamSize);
    if (newTeamSize !== oldTeamSize) {
      const groups = await tx.tournamentGroup.findMany({
        where: { tournamentId: id },
        select: { members: { select: { id: true, userId: true, user: { select: { handicapIndex: true } } } } },
      });
      for (const g of groups) {
        const teams = newTeamSize > 1
          ? splitIntoTeams(g.members.map((m) => ({ userId: m.userId, handicap: m.user.handicapIndex })), newTeamSize)
          : null;
        for (const m of g.members) {
          await tx.tournamentGroupMember.update({ where: { id: m.id }, data: { teamNumber: teams?.get(m.userId) ?? null } });
        }
      }
    }

    return tx.tournament.update({ where: { id }, data });
  });

  await logTournamentAction(session.user.id, "tournament.edit", { id, createdById: tournament.createdById }, "Edited event");
  return Response.json({ tournament: updated });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament) return Response.json({ error: "Tournament not found" }, { status: 404 });
  if (!(await canOrganise(tournament.createdById, session.user.id))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await logTournamentAction(session.user.id, "tournament.delete", { id, createdById: tournament.createdById }, "Deleted event");
  await deleteTournamentWithRounds(id);

  return Response.json({ success: true });
}
