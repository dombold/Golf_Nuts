import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

type PairRow = { user_a: string; user_b: string; count: bigint };

function fisherYates<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getPairCount(a: string, b: string, map: Map<string, number>): number {
  const key = a < b ? `${a}:${b}` : `${b}:${a}`;
  return map.get(key) ?? 0;
}

function buildGroups(
  playerIds: string[],
  pairingCount: Map<string, number>,
  defaultTeeId: string
) {
  const n = playerIds.length;
  const numGroups = Math.ceil(n / 4);
  const shuffled = fisherYates([...playerIds]);
  const remaining = new Set(shuffled);

  const groups: { groupNumber: number; teeId: string; members: string[] }[] =
    Array.from({ length: numGroups }, (_, i) => ({
      groupNumber: i + 1,
      teeId: defaultTeeId,
      members: [],
    }));

  for (let i = 0; i < numGroups; i++) {
    const group = groups[i];
    const isLast = i === numGroups - 1;

    while (group.members.length < 4 && remaining.size > 0) {
      if (isLast) {
        for (const id of remaining) group.members.push(id);
        remaining.clear();
        break;
      }

      let bestPlayer: string | null = null;
      let bestScore = Infinity;

      for (const candidate of remaining) {
        const score = group.members.reduce(
          (sum, member) => sum + getPairCount(candidate, member, pairingCount),
          0
        );
        if (score < bestScore) {
          bestScore = score;
          bestPlayer = candidate;
        }
      }

      if (bestPlayer) {
        group.members.push(bestPlayer);
        remaining.delete(bestPlayer);
      }
    }
  }

  return groups.map((g) => ({
    groupNumber: g.groupNumber,
    teeId: g.teeId,
    members: g.members.map((userId) => ({ userId })),
  }));
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: tournamentId } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { createdById: true, status: true, teeId: true },
  });
  if (!tournament) return Response.json({ error: "Tournament not found" }, { status: 404 });
  if (tournament.createdById !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (tournament.status !== "UPCOMING") {
    return Response.json(
      { error: "Cannot randomise after tournament has started" },
      { status: 400 }
    );
  }

  const invitations = await prisma.tournamentInvitation.findMany({
    where: { tournamentId, status: "ACCEPTED" },
    select: { userId: true },
  });
  const playerIds = invitations.map((i) => i.userId);

  if (playerIds.length === 0) return Response.json({ groups: [] });

  const defaultTeeId = tournament.teeId ?? "";

  const pairRows = await prisma.$queryRaw<PairRow[]>`
    SELECT
      rp1."userId" AS user_a,
      rp2."userId" AS user_b,
      COUNT(*)     AS count
    FROM round_players rp1
    JOIN round_players rp2
      ON rp1."roundId" = rp2."roundId"
     AND rp1."userId" < rp2."userId"
    WHERE rp1."userId" = ANY(${playerIds}::text[])
      AND rp2."userId" = ANY(${playerIds}::text[])
    GROUP BY rp1."userId", rp2."userId"
  `;

  const pairingCount = new Map<string, number>();
  for (const row of pairRows) {
    pairingCount.set(`${row.user_a}:${row.user_b}`, Number(row.count));
  }

  const groups = buildGroups(playerIds, pairingCount, defaultTeeId);

  return Response.json({ groups });
}
