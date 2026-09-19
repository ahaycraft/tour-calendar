import http2 from "node:http2";
import { importPKCS8, SignJWT } from "jose";

// Apple's ActivityKit push-to-start/update API — see
// https://developer.apple.com/documentation/activitykit/starting-and-updating-live-activities-with-activitykit-push-notifications.
// This is a *separate* channel from lib/push.ts's sendPushToUsers: Expo's
// push relay (used for ordinary notifications) doesn't support Live
// Activity push types, so these go straight to Apple's APNs instead.
//
// Requires an Apple Push Notifications service Auth Key (generated once at
// developer.apple.com under Certificates, Identifiers & Profiles > Keys,
// with the "Apple Push Notifications service (APNs)" capability checked):
//   APNS_TEAM_ID       Apple Developer Team ID (e.g. 3953PXGUB9)
//   APNS_KEY_ID        the Key ID shown when the key was created
//   APNS_AUTH_KEY      the key's .p8 file contents (PEM, "\n"-escaped is fine)
//   APNS_BUNDLE_ID     defaults to com.ahaycraft.woodshedd-mobile
//   APNS_ENV           "production" (default) or "sandbox" — sandbox is only
//                      for a build run straight from Xcode; EAS dev-client
//                      and TestFlight/App Store builds both use production
// All calls silently no-op (return false) when these aren't set, so this is
// safe to wire in before the key exists.

const TEAM_ID = process.env.APNS_TEAM_ID;
const KEY_ID = process.env.APNS_KEY_ID;
const AUTH_KEY = process.env.APNS_AUTH_KEY;
const BUNDLE_ID = process.env.APNS_BUNDLE_ID ?? "com.ahaycraft.woodshedd-mobile";
const APNS_HOST =
  process.env.APNS_ENV === "sandbox"
    ? "api.sandbox.push.apple.com"
    : "api.push.apple.com";
// Apple asks for at most one new token every 20 minutes; a fresh one is good
// for up to an hour, so cache well inside that window.
const TOKEN_TTL_SECONDS = 45 * 60;

let cached: { jwt: string; issuedAt: number } | null = null;

async function providerToken(): Promise<string | null> {
  if (!TEAM_ID || !KEY_ID || !AUTH_KEY) return null;

  const now = Math.floor(Date.now() / 1000);
  if (cached && now - cached.issuedAt < TOKEN_TTL_SECONDS) return cached.jwt;

  const key = await importPKCS8(AUTH_KEY.replace(/\\n/g, "\n"), "ES256");
  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: KEY_ID })
    .setIssuer(TEAM_ID)
    .setIssuedAt(now)
    .sign(key);

  cached = { jwt, issuedAt: now };
  return jwt;
}

interface LiveActivityContent {
  /** The name passed as createLiveActivity's first argument on the client
   *  (e.g. "UpcomingShowActivity") — must match exactly. */
  name: string;
  /** The widget component's props, matching its declared prop shape. */
  props: object;
}

function sendApnsRequest(
  deviceToken: string,
  jwt: string,
  body: string
): Promise<boolean> {
  return new Promise((resolve) => {
    const client = http2.connect(`https://${APNS_HOST}`);
    client.on("error", () => resolve(false));

    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${deviceToken}`,
      authorization: `bearer ${jwt}`,
      "apns-push-type": "liveactivity",
      "apns-topic": `${BUNDLE_ID}.push-type.liveactivity`,
      "apns-priority": "10"
    });

    let status = 0;
    let data = "";
    req.on("response", (headers) => {
      status = Number(headers[":status"]) || 0;
    });
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => {
      data += chunk;
    });
    req.on("end", () => {
      client.close();
      if (status !== 200) {
        console.error("APNs Live Activity push failed", status, data);
      }
      resolve(status === 200);
    });
    req.on("error", () => resolve(false));

    req.write(body);
    req.end();
  });
}

/**
 * Push-to-start: creates the Live Activity on the device with no app
 * interaction needed, using its push-to-start token (from expo-widgets'
 * addPushToStartTokenListener, registered via POST
 * /api/mobile/live-activity-token). Returns false without sending anything
 * if the APNs key isn't configured yet, or Apple rejects the request.
 */
export async function pushToStartLiveActivity(
  pushToStartToken: string,
  content: LiveActivityContent
): Promise<boolean> {
  const jwt = await providerToken();
  if (!jwt) return false;

  const body = JSON.stringify({
    aps: {
      timestamp: Math.floor(Date.now() / 1000),
      event: "start",
      "attributes-type": "LiveActivityAttributes",
      attributes: {},
      "content-state": { name: content.name, props: JSON.stringify(content.props) }
    }
  });

  return sendApnsRequest(pushToStartToken, jwt, body);
}
