import Link from "next/link";
import {
  ACTIVITY_RANGES,
  countByKind,
  getActivity,
  parseActivityRange,
  rangeStart,
  type ActivityRange,
} from "@/lib/activityFeed";

function formatTime(at: Date, range: ActivityRange) {
  return at.toLocaleString("en-AU", {
    timeZone: "Australia/Perth",
    ...(range === "today" ? {} : { weekday: "short", day: "numeric", month: "short" }),
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AdminActivityPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const range = parseActivityRange((await searchParams).range);
  const items = await getActivity(rangeStart(range));
  const counts = countByKind(items);

  const link = "px-3 py-1.5 rounded-lg border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500";

  return (
    <div className="space-y-3">
      <nav aria-label="Time range" className="flex flex-wrap gap-2">
        {(Object.keys(ACTIVITY_RANGES) as ActivityRange[]).map((r) => (
          <Link
            key={r}
            href={`/admin/activity?range=${r}`}
            aria-current={r === range ? "page" : undefined}
            className={`${link} ${
              r === range
                ? "border-fairway-700 bg-fairway-700 text-white"
                : "border-fairway-200 text-fairway-700 hover:bg-fairway-50 active:bg-fairway-100"
            }`}
          >
            {ACTIVITY_RANGES[r]}
          </Link>
        ))}
      </nav>

      <p className="text-xs text-gray-500">
        Times are AWST. Only each member&apos;s latest sign-in is kept, and members who stay signed in won&apos;t show a new one.
      </p>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500">Nothing yet in this period.</p>
      ) : (
        <>
          <ul aria-label="Summary" className="flex flex-wrap gap-2">
            {counts.map((c) => (
              <li key={c.kind} className="rounded-full bg-fairway-50 px-3 py-1 text-xs font-medium text-fairway-800">
                {c.count} {c.label}
              </li>
            ))}
          </ul>
          <ol className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {items.map((i) => (
              <li key={i.id} className="px-4 py-3 flex gap-3">
                <time dateTime={i.at.toISOString()} className="shrink-0 w-24 text-xs text-gray-500 pt-0.5 tabular-nums">
                  {formatTime(i.at, range)}
                </time>
                <p className="text-sm text-gray-800 break-words min-w-0">
                  <span className="font-medium">{i.who}</span>{" "}
                  {i.href ? (
                    <Link href={i.href} className="text-fairway-700 hover:underline active:text-fairway-900 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500">
                      {i.text}
                    </Link>
                  ) : (
                    i.text
                  )}
                </p>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
