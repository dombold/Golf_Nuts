import { prisma } from "@/lib/prisma";
import Pager, { pageParam } from "@/components/admin/Pager";

const PAGE_SIZE = 50;

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = pageParam((await searchParams).page);
  const entries = await prisma.adminAuditLog.findMany({
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE + 1,
  });
  const hasNext = entries.length > PAGE_SIZE;

  if (entries.length === 0) {
    return <p className="text-sm text-gray-500">Nothing yet. Actions administrators take on other people&apos;s events, rounds and accounts appear here.</p>;
  }

  return (
    <div className="space-y-3">
      <ol className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {entries.slice(0, PAGE_SIZE).map((e) => (
          <li key={e.id} className="px-4 py-3">
            <p className="text-sm text-gray-800 break-words">{e.summary}</p>
            <p className="text-xs text-gray-500">
              {e.actor?.name ?? "Deleted member"} ·{" "}
              <time dateTime={e.createdAt.toISOString()}>
                {e.createdAt.toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}
              </time>{" "}
              · <span className="font-mono">{e.action}</span>
            </p>
          </li>
        ))}
      </ol>
      <Pager basePath="/admin/audit" page={page} hasNext={hasNext} />
    </div>
  );
}
