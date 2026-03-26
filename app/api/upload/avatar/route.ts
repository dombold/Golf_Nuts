import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink, mkdir } from "fs/promises";
import path from "path";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const userId = session.user.id;

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED_TYPES[file.type]) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP, or GIF images are allowed" },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File must be under 2 MB" }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[file.type];
  const filename = `${userId}.${ext}`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads", "avatars");
  const filePath = path.join(uploadsDir, filename);

  // Remove any existing avatar with a different extension
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarUrl: true },
  });
  if (user?.avatarUrl) {
    const oldFilename = path.basename(user.avatarUrl);
    if (oldFilename !== filename) {
      const oldPath = path.join(uploadsDir, oldFilename);
      await unlink(oldPath).catch(() => {/* ignore if missing */});
    }
  }

  await mkdir(uploadsDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const avatarUrl = `/uploads/avatars/${filename}`;
  await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
  });

  return NextResponse.json({ url: avatarUrl });
}
