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
  status: z.enum(["UPCOMING", "ACTIVE", "COMPLETE"]),
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

  const updated = await prisma.tournament.update({
    where: { id },
    data: { status: parsed.data.status },
  });

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
