import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { issuePasswordReset } from "@/lib/passwordReset";
import { z } from "zod";

const Schema = z.object({ email: z.email() });

// A Response body can only be read once — build a fresh one per request
const ok = () => Response.json({ ok: true });

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return ok();

  const { email } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.isGuest) return ok();

  await issuePasswordReset({ id: user.id, email });

  return ok();
}
