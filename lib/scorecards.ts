import path from "path";

/**
 * Scorecard uploads live outside public/ so they are never served directly —
 * only admins can fetch them, through /api/admin/scorecards/[id]/file.
 */
export const SCORECARD_DIR = path.join(process.cwd(), "uploads", "scorecards");

export const SCORECARD_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/** Allowed upload types → stored file extension */
export const SCORECARD_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
};

/** Pending submissions a single member may have outstanding at once */
export const SCORECARD_PENDING_LIMIT = 10;

/** Server-generated file name for a submission — never derived from the client's file name. */
export function scorecardFileName(submissionId: string, mimeType: string): string {
  return `${submissionId}.${SCORECARD_TYPES[mimeType]}`;
}

export function scorecardPath(fileName: string): string {
  // basename guards against any path segments sneaking into a stored name
  return path.join(SCORECARD_DIR, path.basename(fileName));
}

/** Leading bytes ("magic numbers") each allowed type must start with */
export function matchesFileSignature(mimeType: string, head: Uint8Array): boolean {
  const ascii = (from: number, to: number) => String.fromCharCode(...head.slice(from, to));
  switch (mimeType) {
    case "image/jpeg":
      return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    case "image/png":
      return head[0] === 0x89 && ascii(1, 4) === "PNG";
    case "image/webp":
      return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
    case "image/heic":
    case "image/heif":
      return ascii(4, 8) === "ftyp";
    case "application/pdf":
      return ascii(0, 5) === "%PDF-";
    default:
      return false;
  }
}
