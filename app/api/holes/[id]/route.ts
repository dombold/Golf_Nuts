import { requireAdmin } from "@/lib/permissions";
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
  // Hole coordinates (for the satellite hole maps) are maintained by administrators
  const admin = await requireAdmin();
  if ("response" in admin) return admin.response;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = UpdateHoleSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const exists = await prisma.hole.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return Response.json({ error: "Hole not found" }, { status: 404 });

  const hole = await prisma.hole.update({
    where: { id },
    data: parsed.data,
  });

  return Response.json({ hole });
}
