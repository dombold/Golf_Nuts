import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin as userIsAdmin } from "@/lib/permissions";
import { APP_VERSION } from "@/lib/changelog";
import { sortSuggestions } from "@/lib/suggestions";
import SuggestionForm from "@/components/suggestions/SuggestionForm";
import SuggestionCard from "@/components/suggestions/SuggestionCard";
import type { SuggestionView } from "@/components/suggestions/types";

export const metadata = { title: "Suggestions · Golf Nuts" };

const dateFmt = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Perth" });
const firstName = (name: string) => name.split(" ")[0];

export default async function SuggestionsPage() {
  const session = await auth();
  const userId = session!.user.id;
  const isAdmin = await userIsAdmin(userId);

  const rows = await prisma.suggestion.findMany({
    select: {
      id: true,
      title: true,
      body: true,
      status: true,
      doneVersion: true,
      createdAt: true,
      authorId: true,
      author: { select: { name: true } },
      _count: { select: { votes: true } },
      votes: { where: { userId }, select: { id: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        select: { id: true, body: true, createdAt: true, userId: true, user: { select: { name: true } } },
      },
    },
  });

  const { open, closed } = sortSuggestions(rows.map((r) => ({ ...r, votes: r._count.votes, voted: r.votes.length > 0 })));
  const view = (r: (typeof open)[number]): SuggestionView => ({
    id: r.id,
    title: r.title,
    body: r.body,
    status: r.status,
    doneVersion: r.doneVersion,
    authorName: firstName(r.author.name),
    date: dateFmt.format(r.createdAt),
    votes: r.votes,
    voted: r.voted,
    mine: r.authorId === userId,
    comments: r.comments.map((c) => ({
      id: c.id,
      body: c.body,
      userName: firstName(c.user.name),
      date: dateFmt.format(c.createdAt),
      mine: c.userId === userId,
    })),
  });

  return (
    <div className="space-y-4">
      <div>
        <Link href="/whats-new" className="text-xs text-fairway-700 hover:underline">← What&apos;s New</Link>
        <h1 className="text-2xl font-bold text-fairway-900 mt-1">Suggestions</h1>
        <p className="text-sm text-gray-500 mt-1">
          Ideas and problems from the group. Tap 👍 on the ones you want most — the most popular rise to the top.
        </p>
      </div>

      <SuggestionForm />

      {open.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">No suggestions yet — be the first!</p>
      ) : (
        <div className="space-y-3">
          {open.map((s) => (
            <SuggestionCard key={s.id} suggestion={view(s)} isAdmin={isAdmin} appVersion={APP_VERSION} />
          ))}
        </div>
      )}

      {closed.length > 0 && (
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer list-none text-sm font-semibold text-fairway-900 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 [&::-webkit-details-marker]:hidden">
            <span className="text-gray-400 transition-transform group-open:rotate-90" aria-hidden="true">▸</span>
            Done &amp; closed ({closed.length})
          </summary>
          <div className="space-y-3 mt-3">
            {closed.map((s) => (
              <SuggestionCard key={s.id} suggestion={view(s)} isAdmin={isAdmin} appVersion={APP_VERSION} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
