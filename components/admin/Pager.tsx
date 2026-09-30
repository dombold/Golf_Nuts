import Link from "next/link";

/** Previous / next links for a paged admin list (?page=N, 1-based). */
export default function Pager({ basePath, page, hasNext }: { basePath: string; page: number; hasNext: boolean }) {
  if (page <= 1 && !hasNext) return null;
  const link = "px-3 py-1.5 rounded-lg border border-fairway-200 text-fairway-700 hover:bg-fairway-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500";
  return (
    <nav aria-label="Pages" className="flex items-center justify-between text-sm">
      {page > 1 ? <Link href={`${basePath}?page=${page - 1}`} className={link}>← Newer</Link> : <span />}
      <span className="text-xs text-gray-500">Page {page}</span>
      {hasNext ? <Link href={`${basePath}?page=${page + 1}`} className={link}>Older →</Link> : <span />}
    </nav>
  );
}

/** Parse ?page= into a safe 1-based page number. */
export function pageParam(value: string | string[] | undefined): number {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(n) && n > 0 ? n : 1;
}
