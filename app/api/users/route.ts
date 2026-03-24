import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const [users, currentUser] = await Promise.all([
    prisma.user.findMany({
      where: { id: { not: userId } },
      select: { id: true, name: true, email: true, handicapIndex: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    }),
  ]);

  return Response.json({ users, currentUser });
}
