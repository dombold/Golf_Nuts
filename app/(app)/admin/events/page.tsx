import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDisplayLabel } from "@/lib/gameFormats";
import ConfirmAction from "@/components/admin/ConfirmAction";
import TransferOrganiser from "@/components/admin/TransferOrganiser";
import Pager, { pageParam } from "@/components/admin/Pager";
import { eventDeletionWarning } from "@/lib/deleteTournament";

const PAGE_SIZE = 25;

const STATUS_STYLES: Record<string, string> = {
  UPCOMING: "bg-acorn-100 text-acorn-700",
  ACTIVE: "bg-fairway-600 text-white",
  COMPLETE: "bg-gray-100 text-gray-600",
};

/** Every event, including old never-started ones hidden from the Events page. */
export default async function AdminEventsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = pageParam((await searchParams).page);

  const [events, members] = await Promise.all([
    prisma.tournament.findMany({
      include: {
        course: { select: { name: true } },
        createdBy: { select: { name: true } },
        _count: { select: { invitations: { where: { status: "ACCEPTED" } } } },
        rounds: {
          select: {
            round: {
              select: {
                status: true,
                format: true,
                tee: { select: { dataIssues: true } },
                players: { select: { user: { select: { name: true, isGuest: true } } } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE + 1,
    }),
    prisma.user.findMany({ where: { isGuest: false }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const hasNext = events.length > PAGE_SIZE;

  if (events.length === 0) return <p className="text-sm text-gray-500">No events yet.</p>;

  return (
    <div className="space-y-3">
      <ul className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {events.slice(0, PAGE_SIZE).map((t) => (
          <li key={t.id} className="px-4 py-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link href={`/tournaments/${t.id}`} className="text-sm font-semibold text-fairway-800 hover:underline break-words">
                  {t.name}
                </Link>
                <p className="text-xs text-gray-500">
                  {formatDisplayLabel(t.format, t.stablefordTeamSize)}
                  {t.course ? ` · ${t.course.name}` : ""}
                  {t.date ? ` · ${t.date.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}` : ""}
                </p>
                <p className="text-xs text-gray-500">
                  Organiser: {t.createdBy.name} · {t._count.invitations} playing
                  {t.scoresLockedAt ? " · 🔒 scores locked" : ""}
                </p>
              </div>
              <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${STATUS_STYLES[t.status]}`}>{t.status}</span>
            </div>
            <div className="flex flex-wrap items-start justify-end gap-2">
              <TransferOrganiser tournamentId={t.id} organiserId={t.createdById} members={members} />
              {t.status === "COMPLETE" && (
                <ConfirmAction
                  url={`/api/admin/tournaments/${t.id}/reopen`}
                  label="Reopen"
                  confirmLabel="Reopen event"
                  prompt="Groups can re-score and finish again."
                />
              )}
              <ConfirmAction
                url={`/api/tournaments/${t.id}`}
                method="DELETE"
                label="Delete"
                confirmLabel="Delete event"
                prompt={eventDeletionWarning(t.rounds.map((tr) => tr.round)) || undefined}
                danger
              />
            </div>
          </li>
        ))}
      </ul>
      <Pager basePath="/admin/events" page={page} hasNext={hasNext} />
    </div>
  );
}
