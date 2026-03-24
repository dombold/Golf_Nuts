import { auth } from "@/lib/auth";
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
          teamNumber: z.number().int().optional(),
        })
      ).max(4),
    })
  ),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: tournamentId } = await params;

  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) return Response.json({ error: "Tournament not found" }, { status: 404 });
  if (tournament.createdById !== session.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (tournament.status !== "UPCOMING") {
    return Response.json({ error: "Cannot modify groups after tournament has started" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = PutSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  // Replace all groups in a transaction
  await prisma.$transaction(async (tx) => {
    // Delete existing groups (cascades to members)
    await tx.tournamentGroup.deleteMany({ where: { tournamentId } });

    // Recreate from payload
    for (const group of parsed.data.groups) {
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

  return Response.json({ success: true });
}
