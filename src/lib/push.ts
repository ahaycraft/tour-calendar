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

/**
 * Fan a notification out to every device the given users have subscribed.
 * Fire-and-forget from request handlers (`void sendPushToUsers(...)`) — never
 * block the HTTP response on the push services.
 *
 * Stale subscriptions (the push service answers 404/410) are deleted as they're
 * encountered; this is required maintenance, not an optimisation.
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload
): Promise<void> {
  if (!configured || userIds.length === 0) return;

  const subs = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
  });
  if (subs.length === 0) return;

  const body = JSON.stringify(payload);

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
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
    })
  );
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
  if (!configured) return;

  const members = await prisma.bandMembership.findMany({
    where: { bandId, userId: { not: exceptUserId } },
    select: { userId: true },
  });

  await sendPushToUsers(
    members.map((m) => m.userId),
    payload
  );
}
