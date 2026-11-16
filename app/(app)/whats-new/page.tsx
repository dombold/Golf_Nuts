import Link from "next/link";
import { APP_VERSION, RELEASES, formatReleaseDate, type ChangeKind, type Release } from "@/lib/changelog";

export const metadata = { title: "What's New · Golf Nuts" };

const KIND_STYLES: Record<ChangeKind, { label: string; className: string }> = {
  new: { label: "New", className: "bg-fairway-100 text-fairway-800" },
  improved: { label: "Improved", className: "bg-acorn-100 text-acorn-800" },
  fixed: { label: "Fixed", className: "bg-gray-100 text-gray-700" },
};

function ChangeList({ changes }: { changes: Release["changes"] }) {
  return (
    <ul className="space-y-2 mt-3">
      {changes.map((c, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-gray-700 leading-relaxed">
          <span className={`shrink-0 mt-0.5 w-[4.75rem] text-center text-[11px] font-semibold rounded-full px-2 py-0.5 ${KIND_STYLES[c.kind].className}`}>
            {KIND_STYLES[c.kind].label}
          </span>
          <span>{c.text}</span>
        </li>
      ))}
    </ul>
  );
}

function ReleaseHeading({ release, latest }: { release: Release; latest: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-gray-500">
        <span className="font-semibold text-fairway-700">v{release.version}</span> · {formatReleaseDate(release.date)}
        {latest && (
          <span className="ml-2 align-middle text-[10px] font-bold uppercase tracking-wide bg-fairway-700 text-white rounded-full px-2 py-0.5">
            Latest
          </span>
        )}
      </p>
      <h2 className="text-base font-semibold text-fairway-900 mt-0.5">{release.title}</h2>
    </div>
  );
}

export default function WhatsNewPage() {
  const [latest, ...older] = RELEASES;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-fairway-900">What&apos;s New</h1>
          <p className="text-sm text-gray-500 mt-1">Updates to Golf Nuts, newest first.</p>
        </div>
        <span className="shrink-0 mt-1 text-xs font-semibold bg-fairway-50 text-fairway-800 border border-fairway-100 rounded-full px-2.5 py-1">
          v{APP_VERSION}
        </span>
      </div>

      {/* Suggestions board */}
      <Link
        href="/suggestions"
        className="flex items-center gap-3 rounded-xl border border-acorn-200 bg-acorn-50 px-4 py-3 hover:bg-acorn-100 active:bg-acorn-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
      >
        <span className="text-2xl" aria-hidden="true">💡</span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-acorn-800">Got an idea or found a problem?</span>
          <span className="block text-xs text-acorn-700">Suggest an improvement and vote for the ones you want most.</span>
        </span>
        <span className="text-acorn-700 font-semibold" aria-hidden="true">→</span>
      </Link>

      {/* Latest release, open */}
      <section className="bg-white rounded-xl border border-fairway-100 shadow-sm p-4">
        <ReleaseHeading release={latest} latest />
        <ChangeList changes={latest.changes} />
      </section>

      {/* Earlier releases, collapsed */}
      {older.map((release) => (
        <details key={release.version} className="group bg-white rounded-xl border border-fairway-50 p-4">
          <summary className="flex items-center justify-between gap-3 cursor-pointer list-none rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 [&::-webkit-details-marker]:hidden">
            <ReleaseHeading release={release} latest={false} />
            <span className="shrink-0 text-gray-400 transition-transform group-open:rotate-90" aria-hidden="true">▸</span>
          </summary>
          <ChangeList changes={release.changes} />
        </details>
      ))}
    </div>
  );
}
