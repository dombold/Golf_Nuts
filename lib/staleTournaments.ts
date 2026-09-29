import { prisma } from "@/lib/prisma";

const STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

/** Never-started events whose date passed more than a week ago. Excluded from every list and count. */
export function staleTournamentWhere() {
  return { status: "UPCOMING" as const, date: { lt: new Date(Date.now() - STALE_AFTER_MS) } };
}

/** Where-clause for events that are still relevant (i.e. not stale). */
export function liveTournamentWhere() {
  return { NOT: staleTournamentWhere() };
}

/** Delete stale events (cascades to invitations, groups, prize holes). Called from write paths only. */
export async function pruneStaleTournaments() {
  await prisma.tournament.deleteMany({ where: staleTournamentWhere() });
}
