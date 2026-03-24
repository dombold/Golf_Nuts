import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { z } from "zod";

const UpdateHoleSchema = z.object({
  teeLat:   z.number().min(-90).max(90).nullable().optional(),
  teeLng:   z.number().min(-180).max(180).nullable().optional(),
  greenLat: z.number().min(-90).max(90).nullable().optional(),
  greenLng: z.number().min(-180).max(180).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = UpdateHoleSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const hole = await prisma.hole.update({
    where: { id },
    data: parsed.data,
  });

  return Response.json({ hole });
}
