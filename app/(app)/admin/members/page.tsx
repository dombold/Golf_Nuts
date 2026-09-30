import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import MembersManager from "@/components/admin/MembersManager";
import HandicapTool from "@/components/admin/HandicapTool";

export default async function AdminMembersPage() {
  const session = await auth();
  const users = await prisma.user.findMany({
    where: { isGuest: false },
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      name: true,
      email: true,
      handicapIndex: true,
      isAdmin: true,
      createdAt: true,
      _count: { select: { rounds: true } },
    },
    orderBy: { name: "asc" },
  });

  const members = users.map(({ createdAt, _count, ...u }) => ({
    ...u,
    joined: createdAt.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }),
    rounds: _count.rounds,
  }));

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-base font-semibold text-fairway-900">Members ({members.length})</h2>
        <p className="text-xs text-gray-500">
          Tick members to delete them, along with the events they organised and rounds only they played.
        </p>
        <MembersManager members={members} currentUserId={session!.user.id} />
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-fairway-900">Handicaps — everyone</h2>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <HandicapTool />
        </div>
      </section>
    </div>
  );
}
