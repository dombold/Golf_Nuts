import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcPlayingHandicap } from "@/lib/handicap";
import { NextRequest } from "next/server";
import { z } from "zod";
import { GameFormatSchema, teamSizeFor } from "@/lib/gameFormats";
import { splitIntoTeams } from "@/lib/teams";
import { GuestInputSchema, createGuest, pruneGuests, validateGuestName } from "@/lib/guests";
import { isIncompleteTee } from "@/lib/teeDataIssues";

const CreateRoundSchema = z
  .object({
    courseId: z.string(),
    teeId: z.string(),
    holesCount: z.union([z.literal(9), z.literal(18)]).default(18),
    startingHole: z.union([z.literal(1), z.literal(10)]).default(1),
    format: GameFormatSchema,
    playerIds: z.array(z.string()).min(1).max(8),
    /** Unregistered players, added by the round creator. `tempId` stands in for a userId in `teams`. */
    guests: z.array(GuestInputSchema.extend({ tempId: z.string().min(1) })).max(7).default([]),
    date: z.string().refine((d) => !Number.isNaN(Date.parse(d)), "Invalid date").optional(),
    skinsCarryOver: z.boolean().default(true),
    stablefordTeamSize: z.union([z.literal(1), z.literal(2), z.literal(4)]).default(1),
    /** Team games: which team each player (userId or guest tempId) is on (auto-split by handicap if omitted) */
    teams: z.array(z.object({ userId: z.string(), teamNumber: z.int().min(1).max(8) })).optional(),
  })
  .refine((d) => new Set(d.playerIds).size + d.guests.length <= 8, {
    message: "A round can have at most 8 players",
    path: ["guests"],
  })
  .refine((d) => d.format !== "MATCH_PLAY" || new Set(d.playerIds).size + d.guests.length === 2, {
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
  const stablefordTeamSize = format === "STABLEFORD" ? parsed.data.stablefordTeamSize : 1;
  const teamSize = teamSizeFor(format, stablefordTeamSize);
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

  const members = await prisma.user.findMany({
    where: { id: { in: playerIds }, isGuest: false },
    select: { id: true, handicapIndex: true },
  });
  if (members.length !== playerIds.length) {
    return Response.json({ error: { message: "One or more players no longer exist" } }, { status: 400 });
  }

  // Guests: names must not clash with each other or with a registered member
  const { guests } = parsed.data;
  if (new Set(guests.map((g) => g.tempId)).size !== guests.length || guests.some((g) => playerIds.includes(g.tempId))) {
    return Response.json({ error: { message: "Duplicate guest" } }, { status: 400 });
  }
  for (const [i, g] of guests.entries()) {
    const problem = await validateGuestName(prisma, g.name, guests.slice(0, i).map((o) => o.name));
    if (problem) return Response.json({ error: { message: problem } }, { status: 400 });
  }
  // Keyed by the id the client used (userId, or tempId for guests) until the guests exist
  const players = [...members, ...guests.map((g) => ({ id: g.tempId, handicapIndex: g.handicapIndex }))];
  const allIds = players.map((p) => p.id);

  // Team games (Ambrose, team Stableford): every player needs a team
  let teamOf = new Map<string, number>();
  if (teamSize > 1) {
    if (parsed.data.teams) {
      teamOf = new Map(parsed.data.teams.map((t) => [t.userId, t.teamNumber]));
      if (teamOf.size !== parsed.data.teams.length || allIds.some((id) => !teamOf.has(id)) || teamOf.size !== allIds.length) {
        return Response.json({ error: { message: "Every player must be on exactly one team" } }, { status: 400 });
      }
    } else {
      teamOf = splitIntoTeams(players.map((p) => ({ userId: p.id, handicap: p.handicapIndex })), teamSize);
    }
  }

  const creatorId = session.user.id;
  const round = await prisma.$transaction(async (tx) => {
    // Create guests first, then swap their tempIds for real user ids
    const realId = new Map<string, string>();
    for (const g of guests) {
      const created = await createGuest(tx, { name: g.name, handicapIndex: g.handicapIndex, createdById: creatorId });
      realId.set(g.tempId, created.id);
    }
    return tx.round.create({
      data: {
        createdById: creatorId,
        courseId,
        teeId,
        holesCount,
        startingHole,
        format,
        skinsCarryOver,
        stablefordTeamSize,
        date: date ? new Date(date) : new Date(),
        status: "ACTIVE",
        players: {
          create: players.map((p) => ({
            userId: realId.get(p.id) ?? p.id,
            playingHandicap: calcPlayingHandicap(
              p.handicapIndex,
              tee.slope,
              tee.rating,
              tee.par
            ),
            // Only strokeplay on a fully-rated tee can count towards a handicap
            excludeFromHandicap: format !== "STROKEPLAY" || isIncompleteTee(tee),
            teamNumber: teamOf.get(p.id) ?? null,
          })),
        },
      },
      include: {
        players: { include: { user: { select: { name: true } } } },
        course: true,
        tee: { include: { holes: { orderBy: { number: "asc" } } } },
      },
    });
  });

  if (guests.length > 0) await pruneGuests();
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
