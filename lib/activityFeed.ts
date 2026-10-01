import { prisma } from "@/lib/prisma";

export const ACTIVITY_RANGES = {
  today: "Today",
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
} as const;
export type ActivityRange = keyof typeof ACTIVITY_RANGES;

export function parseActivityRange(value: string | string[] | undefined): ActivityRange {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v in ACTIVITY_RANGES ? (v as ActivityRange) : "today";
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
/** Perth is UTC+8 all year (no daylight saving), so "today" can be computed without a tz library. */
const PERTH_OFFSET = 8 * HOUR;

/** Start of the range. "today" is midnight in Perth. */
export function rangeStart(range: ActivityRange, now = new Date()): Date {
  const t = now.getTime();
  if (range === "24h") return new Date(t - DAY);
  if (range === "7d") return new Date(t - 7 * DAY);
  return new Date(Math.floor((t + PERTH_OFFSET) / DAY) * DAY - PERTH_OFFSET);
}

export const ACTIVITY_KINDS = {
  joined: "joined",
  login: "signed in",
  profile: "profile changes",
  round: "rounds",
  event: "events",
  invitation: "invite replies",
  comment: "comments",
  push: "push enabled",
  passkey: "passkeys added",
  reset: "password resets",
  admin: "admin actions",
} as const;
export type ActivityKind = keyof typeof ACTIVITY_KINDS;

export type ActivityItem = {
  id: string;
  at: Date;
  kind: ActivityKind;
  who: string;
  text: string;
  href?: string;
};

/** Per-source cap; plenty for a group of friends, and keeps a busy week from loading everything. */
const TAKE = 200;

/** Everything that happened since `since`, newest first. */
export async function getActivity(since: Date): Promise<ActivityItem[]> {
  const gte = { gte: since };
  const user = { select: { name: true } };

  const [joined, logins, profiles, rounds, events, invitations, comments, pushes, passkeys, resets, admin] =
    await Promise.all([
      prisma.user.findMany({
        where: { isGuest: false, createdAt: gte },
        select: { id: true, name: true, username: true, createdAt: true },
        take: TAKE,
      }),
      prisma.user.findMany({
        where: { isGuest: false, lastLoginAt: gte },
        select: { id: true, name: true, lastLoginAt: true },
        take: TAKE,
      }),
      prisma.user.findMany({
        where: { isGuest: false, updatedAt: gte, createdAt: { lt: since } },
        select: { id: true, name: true, updatedAt: true },
        take: TAKE,
      }),
      prisma.round.findMany({
        where: { createdAt: gte },
        select: { id: true, createdAt: true, format: true, createdBy: user, course: { select: { name: true } } },
        take: TAKE,
      }),
      prisma.tournament.findMany({
        where: { createdAt: gte },
        select: { id: true, name: true, createdAt: true, createdBy: user },
        take: TAKE,
      }),
      prisma.tournamentInvitation.findMany({
        where: { updatedAt: gte, status: { not: "PENDING" } },
        select: { id: true, status: true, updatedAt: true, user, tournament: { select: { id: true, name: true } } },
        take: TAKE,
      }),
      prisma.comment.findMany({
        where: { createdAt: gte },
        select: { id: true, body: true, createdAt: true, roundId: true, user },
        take: TAKE,
      }),
      prisma.pushSubscription.findMany({
        where: { createdAt: gte },
        select: { id: true, createdAt: true, user },
        take: TAKE,
      }),
      prisma.webAuthnCredential.findMany({
        where: { createdAt: gte },
        select: { id: true, name: true, createdAt: true, user },
        take: TAKE,
      }),
      prisma.passwordResetToken.findMany({
        where: { createdAt: gte },
        select: { id: true, createdAt: true, user },
        take: TAKE,
      }),
      prisma.adminAuditLog.findMany({
        where: { createdAt: gte },
        select: { id: true, summary: true, createdAt: true, actor: user },
        take: TAKE,
      }),
    ]);

  const items: ActivityItem[] = [
    ...joined.map((u) => ({
      id: `joined-${u.id}`, at: u.createdAt, kind: "joined" as const, who: u.name,
      text: `created an account (@${u.username})`,
    })),
    ...logins.map((u) => ({
      id: `login-${u.id}`, at: u.lastLoginAt!, kind: "login" as const, who: u.name,
      text: "signed in",
    })),
    ...profiles.map((u) => ({
      id: `profile-${u.id}`, at: u.updatedAt, kind: "profile" as const, who: u.name,
      text: "updated their profile",
    })),
    ...rounds.map((r) => ({
      id: `round-${r.id}`, at: r.createdAt, kind: "round" as const, who: r.createdBy?.name ?? "Deleted member",
      text: `started a round at ${r.course.name}`, href: `/rounds/${r.id}`,
    })),
    ...events.map((t) => ({
      id: `event-${t.id}`, at: t.createdAt, kind: "event" as const, who: t.createdBy.name,
      text: `created the event “${t.name}”`, href: `/tournaments/${t.id}`,
    })),
    ...invitations.map((i) => ({
      id: `invite-${i.id}`, at: i.updatedAt, kind: "invitation" as const, who: i.user.name,
      text: `${i.status === "ACCEPTED" ? "accepted" : "declined"} the invitation to “${i.tournament.name}”`,
      href: `/tournaments/${i.tournament.id}`,
    })),
    ...comments.map((c) => ({
      id: `comment-${c.id}`, at: c.createdAt, kind: "comment" as const, who: c.user.name,
      text: `commented: “${c.body.length > 80 ? c.body.slice(0, 80) + "…" : c.body}”`, href: `/rounds/${c.roundId}`,
    })),
    ...pushes.map((p) => ({
      id: `push-${p.id}`, at: p.createdAt, kind: "push" as const, who: p.user.name,
      text: "turned on push notifications",
    })),
    ...passkeys.map((k) => ({
      id: `passkey-${k.id}`, at: k.createdAt, kind: "passkey" as const, who: k.user.name,
      text: `added a passkey (${k.name})`,
    })),
    ...resets.map((r) => ({
      id: `reset-${r.id}`, at: r.createdAt, kind: "reset" as const, who: r.user.name,
      text: "requested a password reset",
    })),
    ...admin.map((a) => ({
      id: `admin-${a.id}`, at: a.createdAt, kind: "admin" as const, who: a.actor?.name ?? "Deleted member",
      // Summaries start with a past-tense verb ("Edited scores: …"), so they read on after the name
      text: a.summary.charAt(0).toLowerCase() + a.summary.slice(1),
    })),
  ];

  return items.sort((a, b) => b.at.getTime() - a.at.getTime());
}

/** Count of items per kind, in ACTIVITY_KINDS order, omitting kinds with none. */
export function countByKind(items: ActivityItem[]): { kind: ActivityKind; label: string; count: number }[] {
  const counts = new Map<ActivityKind, number>();
  for (const i of items) counts.set(i.kind, (counts.get(i.kind) ?? 0) + 1);
  return (Object.keys(ACTIVITY_KINDS) as ActivityKind[])
    .filter((k) => counts.has(k))
    .map((k) => ({ kind: k, label: ACTIVITY_KINDS[k], count: counts.get(k)! }));
}
