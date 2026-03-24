import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify the current user is a player in this round
  const round = await prisma.round.findFirst({
    where: { id, players: { some: { userId: session.user.id } } },
  });
  if (!round) return Response.json({ error: "Round not found" }, { status: 404 });

  await prisma.round.delete({ where: { id } });

  return Response.json({ success: true });
}
