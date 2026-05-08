import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: teeId } = await params;

  const tee = await prisma.tee.findUnique({
    where: { id: teeId },
    include: {
      holes: {
        orderBy: { number: "asc" },
        select: { id: true, number: true, par: true, strokeIndex: true },
      },
    },
  });

  if (!tee) return Response.json({ error: "Tee not found" }, { status: 404 });

  return Response.json({ holes: tee.holes });
}
