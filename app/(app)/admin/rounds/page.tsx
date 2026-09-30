import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDisplayLabel } from "@/lib/gameFormats";
import ConfirmAction from "@/components/admin/ConfirmAction";
import Pager, { pageParam } from "@/components/admin/Pager";

const PAGE_SIZE = 25;

/** Every casual round — admins can open, score and delete ones they aren't playing in. */
export default async function AdminRoundsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = pageParam((await searchParams).page);

  const where = { tournamentRounds: { none: {} } };
  const [active, rounds] = await Promise.all([
    page === 1
      ? prisma.round.findMany({
          where: { ...where, status: { not: "COMPLETE" } },
          include: roundInclude,
          orderBy: { date: "desc" },
        })
      : Promise.resolve([]),
    prisma.round.findMany({
      where: { ...where, status: "COMPLETE" },
      include: roundInclude,
      orderBy: { date: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE + 1,
    }),
  ]);
  const hasNext = rounds.length > PAGE_SIZE;

  return (
    <div className="space-y-5">
      {page === 1 && (
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-fairway-900">In progress</h2>
          {active.length === 0 ? (
            <p className="text-sm text-gray-500">No casual rounds in progress.</p>
          ) : (
            <RoundList rounds={active} />
          )}
        </section>
      )}
      <section className="space-y-2">
        <h2 className="text-base font-semibold text-fairway-900">Completed</h2>
        {rounds.length === 0 ? (
          <p className="text-sm text-gray-500">No completed casual rounds.</p>
        ) : (
          <RoundList rounds={rounds.slice(0, PAGE_SIZE)} />
        )}
        <Pager basePath="/admin/rounds" page={page} hasNext={hasNext} />
      </section>
      <p className="text-xs text-gray-500">Event rounds are managed from each event&apos;s page (see Events).</p>
    </div>
  );
}

const roundInclude = {
  course: { select: { name: true } },
  createdBy: { select: { name: true } },
  players: { select: { user: { select: { name: true, isGuest: true } } } },
} as const;

type AdminRound = Awaited<ReturnType<typeof prisma.round.findMany<{ include: typeof roundInclude }>>>[number];

function RoundList({ rounds }: { rounds: AdminRound[] }) {
  return (
    <ul className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
      {rounds.map((r) => (
        <li key={r.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-fairway-800 break-words">{r.course.name}</p>
            <p className="text-xs text-gray-500">
              {r.date.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })} ·{" "}
              {formatDisplayLabel(r.format, r.stablefordTeamSize)} ·{" "}
              {r.players.map((p) => p.user.name + (p.user.isGuest ? " (guest)" : "")).join(", ")}
            </p>
            {r.createdBy && <p className="text-xs text-gray-400">Started by {r.createdBy.name}</p>}
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/rounds/${r.id}/score`} className="text-xs text-fairway-700 hover:underline font-medium">
              Score →
            </Link>
            <Link href={`/rounds/${r.id}/summary`} className="text-xs text-fairway-700 hover:underline font-medium">
              View →
            </Link>
            <ConfirmAction url={`/api/rounds/${r.id}`} method="DELETE" label="Delete" confirmLabel="Delete round" danger />
          </div>
        </li>
      ))}
    </ul>
  );
}
