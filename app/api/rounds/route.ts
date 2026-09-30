import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcPlayingHandicap } from "@/lib/handicap";
import { NextRequest } from "next/server";
import { z } from "zod";
import { GameFormatSchema } from "@/lib/gameFormats";

const CreateRoundSchema = z
  .object({
    courseId: z.string(),
    teeId: z.string(),
    holesCount: z.union([z.literal(9), z.literal(18)]).default(18),
    startingHole: z.union([z.literal(1), z.literal(10)]).default(1),
    format: GameFormatSchema,
    playerIds: z.array(z.string()).min(1).max(8),
    date: z.string().refine((d) => !Number.isNaN(Date.parse(d)), "Invalid date").optional(),
    skinsCarryOver: z.boolean().default(true),
  })
  .refine((d) => d.format !== "MATCH_PLAY" || new Set(d.playerIds).size === 2, {
    message: "Match Play needs exactly 2 players",
    path: ["playerIds"],
  });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateRoundSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: { message: parsed.error.issues[0]?.message ?? "Invalid request" } }, { status: 400 });
  }

  const { courseId, teeId, format, date, skinsCarryOver } = parsed.data;
  const holesCount = parsed.data.holesCount;
  const startingHole = holesCount === 18 ? 1 : parsed.data.startingHole;
  const playerIds = [...new Set(parsed.data.playerIds)];
  if (!playerIds.includes(session.user.id)) {
    return Response.json({ error: { message: "You must be one of the players" } }, { status: 400 });
  }

  const tee = await prisma.tee.findUnique({ where: { id: teeId } });
  if (!tee || tee.courseId !== courseId) {
    return Response.json({ error: { message: "Tee not found for this course" } }, { status: 404 });
  }

  const players = await prisma.user.findMany({
    where: { id: { in: playerIds } },
    select: { id: true, handicapIndex: true },
  });
  if (players.length !== playerIds.length) {
    return Response.json({ error: { message: "One or more players no longer exist" } }, { status: 400 });
  }

  const round = await prisma.round.create({
    data: {
      courseId,
      teeId,
      holesCount,
      startingHole,
      format,
      skinsCarryOver,
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
          excludeFromHandicap: format !== "STROKEPLAY",
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

export async function GET() {
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
