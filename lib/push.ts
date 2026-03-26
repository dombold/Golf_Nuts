import webpush from "web-push";
import { prisma } from "@/lib/prisma";

function getWebPush() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  return webpush;
}

interface PushPayload {
  title: string;
  body: string;
  tournamentId: string;
}

export async function sendTournamentInviteNotification(
  userId: string,
  tournamentName: string,
  tournamentId: string
) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) return;

  const payload: PushPayload = {
    title: "Golf Nuts — Tournament Invite",
    body: `You've been invited to "${tournamentName}". Accept or decline?`,
    tournamentId,
  };

  const results = await Promise.allSettled(
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

  return results;
}
