import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

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
                    select: { number: true, strokeIndex: true },
                    orderBy: { number: "asc" },
                  },
                },
              },
              players: {
                include: {
                  user: { select: { id: true, name: true } },
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
  format: z.enum(["STROKEPLAY", "STABLEFORD", "MATCH_PLAY", "SKINS", "AMBROSE_2", "AMBROSE_4"]).optional(),
  date: z.string().nullable().optional(),
  courseId: z.string().nullable().optional(),
  teeId: z.string().nullable().optional(),
  status: z.enum(["UPCOMING", "ACTIVE", "COMPLETE"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament) return Response.json({ error: "Tournament not found" }, { status: 404 });
  if (tournament.createdById !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const { name, format, date, courseId, teeId, status } = parsed.data;

  const isFieldEdit = name !== undefined || format !== undefined || date !== undefined
    || courseId !== undefined || teeId !== undefined;

  if (isFieldEdit && tournament.status !== "UPCOMING") {
    return Response.json(
      { error: "Event details can only be edited while the event is upcoming" },
      { status: 409 }
    );
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (format !== undefined) data.format = format;
  if (date !== undefined) data.date = date ? new Date(date) : null;
  if (courseId !== undefined) data.courseId = courseId;
  if (teeId !== undefined) data.teeId = teeId;
  if (status !== undefined) data.status = status;

  // If the course or tee changes, prize holes are no longer valid — clear them
  const courseChanged = courseId !== undefined && courseId !== tournament.courseId;
  const teeChanged = teeId !== undefined && teeId !== tournament.teeId;
  if (courseChanged || teeChanged) {
    await prisma.tournamentPrizeHole.deleteMany({ where: { tournamentId: id } });
  }

  const updated = await prisma.tournament.update({ where: { id }, data });

  return Response.json({ tournament: updated });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament) return Response.json({ error: "Tournament not found" }, { status: 404 });
  if (tournament.createdById !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.tournament.delete({ where: { id } });

  return Response.json({ success: true });
}
