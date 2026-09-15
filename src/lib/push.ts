import webpush from "web-push";
import { prisma } from "@/lib/prisma";

/**
 * Web Push sender. Everything that notifies a user goes through
 * `sendPushToUsers`. Delivery is best-effort: a push can be dropped or delayed,
 * so the in-app "needs response" badge stays the source of truth — this is a
 * nudge on top of it.
 *
 * Requires VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and WEB_PUSH_CONTACT in the
 * environment. Generate the keys once with `npx web-push generate-vapid-keys`.
 */

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const contact = process.env.WEB_PUSH_CONTACT || "mailto:admin@example.com";

let configured = false;
if (publicKey && privateKey) {
  webpush.setVapidDetails(contact, publicKey, privateKey);
  configured = true;
}

export type PushPayload = {
  title: string;
  body: string;
  /** Path to open when the notification is clicked. Defaults to "/". */
  url?: string;
  /** Collapses notifications that share a tag. */
  tag?: string;
};

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
// Expo's push API accepts at most 100 messages per request.
const EXPO_BATCH_SIZE = 100;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size)
    chunks.push(items.slice(i, i + size));
  return chunks;
}

/**
 * Fan a notification out to every device the given users have subscribed —
 * both browsers (Web Push) and native apps (Expo push tokens, which Expo's
 * own service relays to APNs/FCM for us — no separate credentials needed
 * here). Fire-and-forget from request handlers (`void sendPushToUsers(...)`)
 * — never block the HTTP response on the push services.
 *
 * Stale subscriptions/tokens (the push service reports the device is gone)
 * are deleted as they're encountered; this is required maintenance, not an
 * optimisation.
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload
): Promise<void> {
  if (userIds.length === 0) return;

  const [subs, mobileTokens] = await Promise.all([
    configured
      ? prisma.pushSubscription.findMany({ where: { userId: { in: userIds } } })
      : Promise.resolve([]),
    prisma.mobilePushToken.findMany({ where: { userId: { in: userIds } } })
  ]);

  const body = JSON.stringify(payload);

  const webPushSends = subs.map(async (sub) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth }
        },
        body
      );
    } catch (err) {
      const statusCode =
        err && typeof err === "object" && "statusCode" in err
          ? (err as { statusCode?: number }).statusCode
          : undefined;
      if (statusCode === 404 || statusCode === 410) {
        await prisma.pushSubscription
          .delete({ where: { id: sub.id } })
          .catch(() => {});
      } else {
        console.error("web-push send failed", statusCode ?? err);
      }
    }
  });

  const expoSends = chunk(mobileTokens, EXPO_BATCH_SIZE).map((batch) =>
    sendExpoBatch(batch, payload)
  );

  await Promise.allSettled([...webPushSends, ...expoSends]);
}

async function sendExpoBatch(
  batch: { id: string; token: string }[],
  payload: PushPayload
): Promise<void> {
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate"
      },
      body: JSON.stringify(
        batch.map((t) => ({
          to: t.token,
          title: payload.title,
          body: payload.body,
          data: payload.url ? { url: payload.url } : undefined,
          collapseId: payload.tag
        }))
      )
    });
    if (!res.ok) {
      console.error("Expo push send failed", res.status);
      return;
    }

    const { data } = (await res.json()) as {
      data?: { details?: { error?: string } }[];
    };
    const stale = batch.filter(
      (_, i) => data?.[i]?.details?.error === "DeviceNotRegistered"
    );
    if (stale.length > 0) {
      await prisma.mobilePushToken
        .deleteMany({ where: { id: { in: stale.map((t) => t.id) } } })
        .catch(() => {});
    }
  } catch (err) {
    console.error("Expo push send failed", err);
  }
}

/**
 * Notify every member of a band except `exceptUserId` — normally the person who
 * made the change, who doesn't need to be told about their own action. Same
 * best-effort, fire-and-forget contract as `sendPushToUsers`.
 */
export async function notifyBandMembers(
  bandId: string,
  exceptUserId: string,
  payload: PushPayload
): Promise<void> {
  const members = await prisma.bandMembership.findMany({
    where: { bandId, userId: { not: exceptUserId } },
    select: { userId: true }
  });

  await sendPushToUsers(
    members.map((m) => m.userId),
    payload
  );
}
