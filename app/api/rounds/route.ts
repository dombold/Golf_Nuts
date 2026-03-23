import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcPlayingHandicap } from "@/lib/handicap";
import { NextRequest } from "next/server";
import { z } from "zod";

const CreateRoundSchema = z.object({
  courseId: z.string(),
  teeId: z.string(),
  format: z.enum(["STROKEPLAY", "STABLEFORD", "MATCH_PLAY", "SKINS", "AMBROSE_2", "AMBROSE_4"]),
  playerIds: z.array(z.string()).min(1),
  date: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateRoundSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { courseId, teeId, format, playerIds, date } = parsed.data;

  const tee = await prisma.tee.findUnique({ where: { id: teeId } });
  if (!tee) return Response.json({ error: "Tee not found" }, { status: 404 });

  const players = await prisma.user.findMany({
    where: { id: { in: playerIds } },
    select: { id: true, handicapIndex: true },
  });

  const round = await prisma.round.create({
    data: {
      courseId,
      teeId,
      format,
      date: date ? new Date(date) : new Date(),
      status: "ACTIVE",
      players: {
        create: players.map((p) => ({
          userId: p.id,
          playingHandicap: calcPlayingHandicap(
            p.handicapIndex,
            tee.slope,
            tee.rating,
            tee.par
          ),
        })),
      },
    },
    include: {
      players: { include: { user: { select: { name: true } } } },
      course: true,
      tee: { include: { holes: { orderBy: { number: "asc" } } } },
    },
  });

  return Response.json({ round }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rounds = await prisma.round.findMany({
    where: { players: { some: { userId: session.user.id } } },
    include: {
      course: { select: { name: true } },
      players: { include: { user: { select: { name: true } } } },
    },
    orderBy: { date: "desc" },
    take: 20,
  });

  return Response.json({ rounds });
}
