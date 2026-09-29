import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { z } from "zod";

const PatchSchema = z.object({
  status: z.enum(["ACCEPTED", "DECLINED"]),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: tournamentId } = await params;

  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const invitation = await prisma.tournamentInvitation.findUnique({
    where: { tournamentId_userId: { tournamentId, userId: session.user.id } },
    select: { id: true, tournament: { select: { status: true, createdById: true } } },
  });

  if (!invitation) return Response.json({ error: "Invitation not found" }, { status: 404 });
  if (invitation.tournament.status !== "UPCOMING") {
    return Response.json({ error: "The event has already started" }, { status: 409 });
  }
  if (invitation.tournament.createdById === session.user.id && parsed.data.status === "DECLINED") {
    return Response.json({ error: "The organiser can't decline their own event" }, { status: 400 });
  }

  const updated = await prisma.tournamentInvitation.update({
    where: { id: invitation.id },
    data: { status: parsed.data.status },
  });

  return Response.json({ invitation: updated });
}
