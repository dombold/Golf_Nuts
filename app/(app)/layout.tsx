import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import NavBar from "@/components/NavBar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, username: true, avatarUrl: true },
  });

  return (
    <div className="min-h-screen bg-cream">
      <NavBar user={user ?? { name: session.user.name ?? "User", username: session.user.username ?? "", avatarUrl: null }} />
      {/* Offset for bottom tab bar on mobile, side nav on desktop */}
      <main className="pb-16 md:pb-0 md:pl-52 max-w-full">
        <div className="max-w-4xl mx-auto px-4 py-6">{children}</div>
      </main>
    </div>
  );
}
