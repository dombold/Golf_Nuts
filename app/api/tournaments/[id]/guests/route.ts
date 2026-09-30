import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GuestInputSchema, createGuest, pruneGuests, validateGuestName } from "@/lib/guests";

type Ctx = { params: Promise<{ id: string }> };

/** Organiser adds a guest (unregistered) player to an upcoming event. Guests are accepted straight away. */
export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: { createdById: true, status: true },
  });
  if (!tournament) return Response.json({ error: "Tournament not found" }, { status: 404 });
  if (tournament.createdById !== session.user.id) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (tournament.status !== "UPCOMING") {
    return Response.json({ error: "Guests can only be added before the event starts" }, { status: 409 });
  }

  const parsed = GuestInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid guest" }, { status: 400 });
  }

  const existingGuests = await prisma.tournamentInvitation.findMany({
    where: { tournamentId: id, user: { isGuest: true } },
    select: { user: { select: { name: true } } },
  });
  const problem = await validateGuestName(prisma, parsed.data.name, existingGuests.map((g) => g.user.name));
  if (problem) return Response.json({ error: problem }, { status: 400 });

  const organiserId = session.user.id;
  const guest = await prisma.$transaction(async (tx) => {
    const created = await createGuest(tx, { ...parsed.data, createdById: organiserId });
    await tx.tournamentInvitation.create({ data: { tournamentId: id, userId: created.id, status: "ACCEPTED" } });
    return created;
  });

  await pruneGuests();
  return Response.json({ guest }, { status: 201 });
}
