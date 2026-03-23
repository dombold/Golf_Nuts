import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { z } from "zod";

const CreateSchema = z.object({
  name: z.string().min(2).trim(),
  format: z.enum(["STROKEPLAY", "STABLEFORD", "MATCH_PLAY", "SKINS", "AMBROSE_2", "AMBROSE_4"]),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const tournament = await prisma.tournament.create({
    data: { name: parsed.data.name, format: parsed.data.format },
  });

  return Response.json({ tournament }, { status: 201 });
}
