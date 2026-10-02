import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ConfirmAction from "@/components/admin/ConfirmAction";
import { shortDataIssueLabels } from "@/lib/teeDataIssues";
import type { Prisma } from "@/app/generated/prisma/client";

const REVIEWED_SHOWN = 25;

function formatDate(d: Date) {
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const submissionSelect = {
  id: true,
  status: true,
  note: true,
  mimeType: true,
  sizeBytes: true,
  createdAt: true,
  reviewedAt: true,
  course: { select: { id: true, name: true } },
  tee: { select: { name: true } },
  user: { select: { name: true } },
  reviewedBy: { select: { name: true } },
} as const;

type Submission = Prisma.ScorecardSubmissionGetPayload<{ select: typeof submissionSelect }>;

function SubmissionRow({ s }: { s: Submission }) {
  return (
    <li className="px-4 py-3 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/courses/${s.course.id}`} className="text-sm font-semibold text-fairway-800 hover:underline break-words">
            {s.course.name}
          </Link>
          {s.tee && <span className="text-sm text-gray-500"> · {s.tee.name} tees</span>}
          <p className="text-xs text-gray-500">
            From {s.user?.name ?? "a former member"} · {formatDate(s.createdAt)} · {s.mimeType === "application/pdf" ? "PDF" : "Photo"},{" "}
            {formatSize(s.sizeBytes)}
          </p>
          {s.note && <p className="mt-1 text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 break-words">{s.note}</p>}
          {s.status === "REVIEWED" && s.reviewedAt && (
            <p className="text-xs text-gray-400">
              Reviewed {formatDate(s.reviewedAt)}
              {s.reviewedBy ? ` by ${s.reviewedBy.name}` : ""}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-start justify-end gap-2">
        <a
          href={`/api/admin/scorecards/${s.id}/file`}
          target="_blank"
          rel="noopener"
          className="text-xs px-2 py-1 rounded-lg border border-fairway-200 text-fairway-800 hover:bg-fairway-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500"
        >
          View scorecard
        </a>
        {s.status === "PENDING" && (
          <ConfirmAction
            url={`/api/admin/scorecards/${s.id}`}
            method="PATCH"
            label="Mark reviewed"
            confirmLabel="Mark reviewed"
            prompt="Update data/wa_courses_full.json and re-run the seed to complete the course."
          />
        )}
      </div>
    </li>
  );
}

/** Scorecards sent in by members, and every course whose scorecard data is incomplete. */
export default async function AdminCoursesPage() {
  const [pending, reviewed, incompleteCourses] = await Promise.all([
    prisma.scorecardSubmission.findMany({ where: { status: "PENDING" }, select: submissionSelect, orderBy: { createdAt: "asc" } }),
    prisma.scorecardSubmission.findMany({
      where: { status: "REVIEWED" },
      select: submissionSelect,
      orderBy: { reviewedAt: "desc" },
      take: REVIEWED_SHOWN,
    }),
    prisma.course.findMany({
      where: { tees: { some: { NOT: { dataIssues: { isEmpty: true } } } } },
      select: {
        id: true,
        name: true,
        region: true,
        tees: {
          where: { NOT: { dataIssues: { isEmpty: true } } },
          select: { id: true, name: true, dataIssues: true },
          orderBy: { name: "asc" },
        },
        _count: { select: { scorecardSubmissions: { where: { status: "PENDING" } } } },
      },
      orderBy: { name: "asc" },
    }),
  ]);


  const incompleteTeeCount = incompleteCourses.reduce((n, c) => n + c.tees.length, 0);

  return (
    <div className="space-y-6">
      <section aria-labelledby="scorecards-heading" className="space-y-2">
        <h2 id="scorecards-heading" className="text-lg font-semibold text-fairway-900">
          Scorecards sent in{pending.length > 0 ? ` (${pending.length} to review)` : ""}
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-gray-500">No scorecards waiting for review.</p>
        ) : (
          <ul className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {pending.map((s) => (
              <SubmissionRow key={s.id} s={s} />
            ))}
          </ul>
        )}
        {reviewed.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-fairway-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 rounded">
              Recently reviewed ({reviewed.length})
            </summary>
            <ul className="mt-2 bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              {reviewed.map((s) => (
                <SubmissionRow key={s.id} s={s} />
              ))}
            </ul>
          </details>
        )}
      </section>

      <section aria-labelledby="incomplete-heading" className="space-y-2">
        <h2 id="incomplete-heading" className="text-lg font-semibold text-fairway-900">
          Courses with incomplete data
        </h2>
        <p className="text-sm text-gray-500">
          {incompleteCourses.length} courses ({incompleteTeeCount} tees). Rounds on these tees never count towards handicaps. To complete
          one, fill in its missing values in <code className="text-xs">data/wa_courses_full.json</code> and re-run the seed.
        </p>
        <ul className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {incompleteCourses.map((c) => (
            <li key={c.id} className="px-4 py-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <Link href={`/courses/${c.id}`} className="text-sm font-semibold text-fairway-800 hover:underline break-words">
                  {c.name}
                </Link>
                {c._count.scorecardSubmissions > 0 && (
                  <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    {c._count.scorecardSubmissions} scorecard{c._count.scorecardSubmissions === 1 ? "" : "s"} sent
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">{c.region ?? "—"}</p>
              <ul className="mt-1 space-y-0.5">
                {c.tees.map((t) => (
                  <li key={t.id} className="text-xs text-gray-600">
                    <span className="font-medium text-gray-700">{t.name}:</span> {shortDataIssueLabels(t.dataIssues).join(", ")}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
