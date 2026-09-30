import { cache } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Whether a user is an administrator. Read from the database (not the session token) so
 * promoting or demoting someone takes effect on their next request. Memoised per render.
 */
export const isAdmin = cache(async (userId: string): Promise<boolean> => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
  return user?.isAdmin ?? false;
});

/** The organiser (creator) of an event or round, or any administrator. */
export async function canOrganise(createdById: string | null | undefined, userId: string): Promise<boolean> {
  if (createdById && createdById === userId) return true;
  return isAdmin(userId);
}

/**
 * Guard for /api/admin routes: the signed-in administrator's id, or the error response to return.
 * Non-admins get 404 — the admin API doesn't advertise itself.
 */
export async function requireAdmin(): Promise<{ userId: string } | { response: Response }> {
  const session = await auth();
  if (!session?.user?.id) return { response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!(await isAdmin(session.user.id))) return { response: Response.json({ error: "Not found" }, { status: 404 }) };
  return { userId: session.user.id };
}

export interface AuditTarget {
  type: "tournament" | "round" | "user" | "guest" | "handicap";
  id?: string | null;
  /** Who normally owns the target. When the actor is the owner nothing is logged — it's ordinary use. */
  ownerId?: string | null;
}

/**
 * Record an action an administrator took on something that isn't theirs. Never throws.
 * `dedupeMinutes` skips the entry when the same actor already logged this action on this target
 * within that window (e.g. one "score edit" entry per card, not one per hole).
 */
export async function logAdminAction(
  actorId: string,
  action: string,
  target: AuditTarget,
  summary: string,
  { dedupeMinutes }: { dedupeMinutes?: number } = {}
) {
  if (target.ownerId && target.ownerId === actorId) return;
  try {
    if (dedupeMinutes) {
      const recent = await prisma.adminAuditLog.findFirst({
        where: {
          actorId,
          action,
          targetId: target.id ?? null,
          createdAt: { gt: new Date(Date.now() - dedupeMinutes * 60_000) },
        },
        select: { id: true },
      });
      if (recent) return;
    }
    await prisma.adminAuditLog.create({
      data: { actorId, action, targetType: target.type, targetId: target.id ?? null, summary },
    });
  } catch (err) {
    console.error("Failed to write admin audit log", err);
  }
}

/** "Course name, 2026-09-28" — a readable name for a round in audit summaries. */
export async function roundLabel(roundId: string): Promise<string> {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    select: { date: true, course: { select: { name: true } } },
  });
  return round ? `${round.course.name}, ${round.date.toISOString().slice(0, 10)}` : roundId;
}

/** Log an administrator's action on another organiser's event, e.g. `("tournament.start", …, "Started")`. */
export async function logTournamentAction(
  actorId: string,
  action: string,
  tournament: { id: string; createdById: string },
  verb: string
) {
  if (tournament.createdById === actorId) return;
  const t = await prisma.tournament.findUnique({ where: { id: tournament.id }, select: { name: true } });
  await logAdminAction(
    actorId,
    action,
    { type: "tournament", id: tournament.id, ownerId: tournament.createdById },
    `${verb}: ${t?.name ?? tournament.id}`
  );
}
