import { encode, decode } from "next-auth/jwt";
import { headers } from "next/headers";

// A separate JWT from the NextAuth session cookie's own encode/decode —
// its own salt means it can never be confused with, or substituted for,
// a session cookie. Mobile clients (no cookie jar) send this as
// `Authorization: Bearer <token>` instead.
const MOBILE_TOKEN_SALT = "mobile-bearer-token";
// Matches the web session's own maxAge (see src/auth/index.ts) — this is a
// band-only app, people expect to stay signed in.
export const MOBILE_TOKEN_MAX_AGE = 60 * 60 * 24 * 365;

// NextAuth's own config falls back to the legacy NEXTAUTH_SECRET name when
// AUTH_SECRET isn't set (production here still uses the old name) — mirror
// that fallback since encode()/decode() below are called directly, outside
// NextAuth's own config resolution.
const AUTH_SECRET = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET!;

interface MobileTokenPayload {
  id: string;
  role: string;
}

/** Mints a mobile bearer token for `POST /api/mobile/login` to return. */
export async function mintMobileToken(
  payload: MobileTokenPayload
): Promise<string> {
  return encode({
    secret: AUTH_SECRET,
    salt: MOBILE_TOKEN_SALT,
    maxAge: MOBILE_TOKEN_MAX_AGE,
    token: payload
  });
}

function bearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice("Bearer ".length).trim() || null;
}

/** Decodes a raw bearer token string. Returns null for a missing/malformed/
 *  tampered/expired token, or one missing the fields it needs — never
 *  throws, so callers can treat it exactly like "no session". */
async function decodeMobileToken(
  token: string | null
): Promise<MobileTokenPayload | null> {
  if (!token) return null;
  try {
    const payload = await decode({
      secret: AUTH_SECRET,
      salt: MOBILE_TOKEN_SALT,
      token
    });
    const id = payload?.id;
    const role = payload?.role;
    if (typeof id !== "string" || typeof role !== "string") return null;
    return { id, role };
  } catch {
    return null;
  }
}

/**
 * Reads and decodes the current request's `Authorization: Bearer <token>`
 * header, if present, via `next/headers` — for Server Components and Route
 * Handlers.
 */
export async function readMobileToken(): Promise<MobileTokenPayload | null> {
  const authHeader = (await headers()).get("authorization");
  return decodeMobileToken(bearerToken(authHeader));
}

/**
 * Same check as `readMobileToken`, but for the proxy/middleware layer
 * (`src/proxy.ts`'s `authorized` callback in src/auth/index.ts), which gets
 * headers directly off the `NextRequest` instead of `next/headers`. Without
 * this, a mobile request carrying only a Bearer token (no session cookie)
 * would get redirected to /login by the proxy before ever reaching a route
 * handler's own Bearer-token fallback.
 */
export async function hasValidMobileToken(
  authHeader: string | null
): Promise<boolean> {
  return (await decodeMobileToken(bearerToken(authHeader))) !== null;
}
