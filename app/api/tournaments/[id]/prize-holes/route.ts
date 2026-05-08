import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

const PrizeHoleSchema = z.object({
  holeNumber: z.number().int().min(1).max(18),
  type: z.enum(["LONGEST_DRIVE", "NEAREST_PIN"]),
});

const PutSchema = z.object({
  prizeHoles: z.array(PrizeHoleSchema),
});

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({ where: { id }, select: { createdById: true, status: true } });
  if (!tournament) return Response.json({ error: "Tournament not found" }, { status: 404 });
  if (tournament.createdById !== session.user.id) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (tournament.status !== "UPCOMING") {
    return Response.json({ error: "Prize holes can only be edited while the event is upcoming" }, { status: 409 });
  }

  const body = await req.json();
  const parsed = PutSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const { prizeHoles } = parsed.data;

  await prisma.$transaction([
    prisma.tournamentPrizeHole.deleteMany({ where: { tournamentId: id } }),
    ...(prizeHoles.length > 0
      ? [prisma.tournamentPrizeHole.createMany({ data: prizeHoles.map((ph) => ({ ...ph, tournamentId: id })) })]
      : []),
  ]);

  const updated = await prisma.tournamentPrizeHole.findMany({
    where: { tournamentId: id },
    select: { holeNumber: true, type: true },
    orderBy: { holeNumber: "asc" },
  });

  return Response.json({ prizeHoles: updated });
}
