# Native iOS app: plan

## Context

Goal: build a native iOS app and move functionality over from the
existing Next.js PWA. After comparing React Native and Flutter, we're
going with **React Native, via Expo** — it reuses the team's
TypeScript/React skills, and Expo Router mirrors the Next.js App Router
mental model already in use here.

The real cost of this path: the UI is a second codebase. React Native
doesn't render HTML/DOM, so none of `src/components/` carries over —
every screen gets rebuilt with RN's own primitives (`View`/`Text`/
`Pressable`, NativeWind if we want Tailwind-style classes back). What
*can* be shared is pure business logic — things like `src/lib/search.ts`,
`src/lib/pagination.ts`'s math, date formatting, validation, and
TypeScript types — but that's a minority of this app's code; most of
what's in `src/components/` is presentation. (This is also true of
Flutter or fully-native Swift — only a "wrap the PWA in Capacitor"
approach avoids a second UI codebase, at the cost of not feeling fully
native, which is why that option was ruled out.)

Investigation of the current backend surfaced two hard blockers that
have to be solved before any mobile client work is useful, plus a scope
note:

1. **Auth is cookie-only.** `src/auth/index.ts` is NextAuth v5 (JWT
   strategy); every one of the ~40 `src/app/api/**/route.ts` handlers
   calls bare `await auth()`, which reads the NextAuth session cookie.
   React Native has no browser cookie jar — it needs a bearer token.
2. **Push is Web-Push-only.** `src/lib/push.ts` sends via VAPID to
   browser `PushSubscription` objects (`endpoint`/`p256dh`/`auth`),
   stored in the `PushSubscription` Prisma model. Native iOS needs APNs,
   which Expo abstracts behind its own push service — no raw APNs
   certs/keys needed as long as we're on Expo.
3. **Scope note:** 17 of 38 page.tsx files fetch via direct Prisma
   queries in server components with no matching API route (e.g. most
   detail/list views beyond shows/songs/releases already exposed under
   `/api`). Those need new GET endpoints eventually, but which ones
   depends on which screens get built first in the mobile app — that's
   ongoing work paced by the mobile app itself, not a prerequisite to
   start. This plan does not enumerate them.

Nothing here is iOS-specific — Bearer-token auth has no platform
dependency, and Expo's push service already abstracts both APNs (iOS)
and FCM (Android) behind the same API, which is why `MobilePushToken`
below carries a `platform` field. Supporting Android later doesn't
change parts 1–2; it only adds to the "next steps" section at the end.

## Part 1: Bearer-token auth, with zero changes to existing API routes

**Goal:** every existing route handler keeps calling bare `await auth()`
exactly as today (web behavior unchanged) — but when there's no session
cookie and an `Authorization: Bearer <token>` header is present instead,
`auth()` resolves the same way for a mobile request.

- **New route `POST /api/mobile/login`** (`src/app/api/mobile/login/route.ts`):
  accepts `{ email, password }`, validates with the same
  `bcrypt.compare` check the Credentials provider's `authorize()` already
  does in `src/auth/index.ts`, and on success mints a JWT with
  `next-auth/jwt`'s `encode()` using the same `AUTH_SECRET` and the same
  long `maxAge` (`60 * 60 * 24 * 365`) the web session already uses.
  Returns `{ token }`.
- **`src/auth/index.ts`**: add a Bearer-token fallback so the module's
  exported `auth` resolves a session from either the cookie or the
  header. Concretely: inside the NextAuth config (or a thin wrapper
  re-exported under the same `auth` name so every existing
  `import { auth } from "@/auth"` keeps working unchanged), if the
  cookie-based lookup comes back empty, read the `Authorization` header
  (via `headers()` from `next/headers`, available in the same request
  scope a Route Handler already runs in) and `decode()` a Bearer token
  with the same secret. On success, rebuild the same session shape the
  `session()` callback already produces today — re-fetching `name` and
  `bandMemberships` fresh from Prisma, exactly like it does for the
  cookie path (`src/auth/index.ts`'s existing `session()` callback is
  the reference implementation to mirror).
  - **Needs verifying during implementation**, since `next-auth` here is
    a beta (`^5.0.0-beta.32`): whether a bare `auth()` call inside a
    Route Handler already has access to the incoming request's headers
    without being passed the `NextRequest` explicitly. If it doesn't,
    the fallback needs the request threaded through instead — a bigger
    (but still mechanical, one-time) change to the route handlers' call
    sites.
- Mobile app stores the returned token in Expo SecureStore (iOS
  Keychain-backed) and sends it as `Authorization: Bearer <token>` on
  every API call — no other change needed on the client side to talk to
  the existing `/api/*` surface once this lands.

## Part 2: Push — add a mobile token path alongside Web Push, unchanged call sites

- **New Prisma model** `MobilePushToken` (`prisma/schema.prisma`),
  mirroring `PushSubscription`'s shape/pattern: `id`, `userId`, `token`
  (Expo push token string, `@unique`), `platform` (`"ios" | "android"`),
  `createdAt`, `@@index([userId])`, plus the matching relation on `User`.
  Kept separate from `PushSubscription` rather than overloading it —
  Expo tokens are a single opaque string with no `p256dh`/`auth` keys,
  so shoehorning them into the Web Push shape would just mean a pile of
  nullable columns.
- **New route** `POST /api/mobile/push-token` (parallel to the existing
  `src/app/api/push/subscribe/route.ts`) — authenticated via the same
  `auth()` from part 1, upserts a `MobilePushToken` row for the caller.
- **`src/lib/push.ts`**: extend `sendPushToUsers` to also fan out to
  each user's `MobilePushToken` rows via Expo's push API
  (`https://exp.host/--/api/v2/push/send`), in the same
  `Promise.allSettled` alongside the existing Web Push loop, pruning a
  token on an Expo `DeviceNotRegistered` ticket the same way a Web Push
  404/410 already prunes a `PushSubscription` row. `notifyBandMembers`
  and every existing call site of `sendPushToUsers`/`notifyBandMembers`
  (show-created notifications, day-before reminders, etc.) need **no
  changes** — they already just pass user ids and a payload.
- No APNs certs/keys to manage ourselves for now — Expo's push service
  handles the APNs leg, using credentials EAS will manage once the app
  is actually built/submitted (part of the next phase, not this one).

## Verification

- `npx tsc --noEmit -p .`, `npx eslint`, `npx vitest run` (add unit
  tests for the new `/api/mobile/login` route and the Bearer-token
  fallback, following the existing pattern in e.g.
  `src/app/api/account/route.test.ts` — mock `@/lib/prisma`, exercise
  success/401/validation-failure cases).
- Manual check with `curl`: log in via `/api/mobile/login` to get a
  token, then call an existing authenticated route (e.g.
  `GET /api/shows?from=...&to=...`) with `Authorization: Bearer <token>`
  and confirm it succeeds — and that the same route still works via the
  normal browser cookie session, unchanged.
- Once `MobilePushToken` is added to the schema, run `npx prisma db
  push` — first against the dev DB, then, with a separate go-ahead, the
  production `DATABASE_URL` (same process as the earlier
  `BandInvite.phone` change).

## Next steps (not part of this pass)

- Scaffolding the actual Expo project (`npx create-expo-app`, Expo
  Router, navigation, first screens) — a separate, more visible
  commitment (new repo/tooling) worth its own go-ahead. One codebase
  builds both the iOS and Android app.
- Store accounts, one per platform, both needing the user's own
  credentials/payment: the Apple Developer Program ($99/yr, also
  required for TestFlight and APNs push) and a Google Play Developer
  account ($25 one-time).
- An Expo/EAS account, and EAS build/signing config for each platform
  (Apple provisioning profiles/certs, an Android keystore) — EAS
  manages the credentials once those store accounts exist.
- Auditing and building the ~17 missing read-only endpoints for
  page.tsx-only views — paced by whichever mobile screens get built
  first, not a blanket prerequisite.
- Later, once the app itself is being built: device/emulator testing on
  both platforms, not just iOS.
