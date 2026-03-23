import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const friendships = await prisma.friend.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    include: {
      requester: { select: { id: true, name: true, email: true, handicapIndex: true } },
      addressee: { select: { id: true, name: true, email: true, handicapIndex: true } },
    },
  });

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });

  const friends = friendships.map((f) =>
    f.requesterId === userId ? f.addressee : f.requester
  );

  return Response.json({ friends, currentUser });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { email } = await req.json();
  if (!z.email().safeParse(email).success) {
    return Response.json({ error: "Invalid email" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { email } });
  if (!target) return Response.json({ error: "User not found" }, { status: 404 });
  if (target.id === session.user.id) {
    return Response.json({ error: "Cannot add yourself" }, { status: 400 });
  }

  const existing = await prisma.friend.findFirst({
    where: {
      OR: [
        { requesterId: session.user.id, addresseeId: target.id },
        { requesterId: target.id, addresseeId: session.user.id },
      ],
    },
  });
  if (existing) return Response.json({ error: "Already friends or request pending" }, { status: 409 });

  const friendship = await prisma.friend.create({
    data: {
      requesterId: session.user.id,
      addresseeId: target.id,
      status: "ACCEPTED", // Direct accept for private group app
    },
  });

  return Response.json({ friendship }, { status: 201 });
}
