import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { notificationNote } from "@/lib/inviteNote";
import { invitePollLine } from "@/lib/polls";

function getWebPush() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  return webpush;
}

interface PushPayload {
  /** The service worker adds Accept / Decline buttons only to invitations */
  kind: "invite" | "poll";
  title: string;
  body: string;
  tournamentId: string;
}

/** Send a notification to every device the user has subscribed; drops expired subscriptions. */
async function sendToUser(userId: string, payload: PushPayload) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) return;

  return Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await getWebPush().sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (err: unknown) {
        // Remove expired/invalid subscriptions
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
        throw err;
      }
    })
  );
}

export async function sendTournamentInviteNotification(
  userId: string,
  tournamentName: string,
  tournamentId: string,
  note?: string | null,
  /** Open polls on the event — mentioned to players invited after they were added */
  openPollQuestions: string[] = []
) {
  const pollLine = invitePollLine(openPollQuestions, (q) => notificationNote(q, 80));
  return sendToUser(userId, {
    kind: "invite",
    title: "Golf Nuts — Tournament Invite",
    body:
      `You've been invited to "${tournamentName}". Accept or decline?` +
      (note ? `\n\n“${notificationNote(note)}”` : "") +
      (pollLine ? `\n\n${pollLine}` : ""),
    tournamentId,
  });
}

/** Tell an invitee the organiser has added a poll to the event. */
export async function sendTournamentPollNotification(
  userId: string,
  organiserName: string,
  tournamentName: string,
  tournamentId: string,
  question: string
) {
  return sendToUser(userId, {
    kind: "poll",
    title: "Golf Nuts — New poll",
    body: `${organiserName} asked: “${notificationNote(question)}” Tap to vote in "${tournamentName}".`,
    tournamentId,
  });
}
