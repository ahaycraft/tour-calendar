import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { Session } from "next-auth";
import {
  readMobileToken,
  hasValidMobileToken,
  MOBILE_TOKEN_MAX_AGE
} from "./mobile";

// NextAuth's own `auth` export is dual-purpose: called bare (`auth()`) it's
// a session getter, but it's also what Next.js's proxy/middleware layer
// invokes with a request — src/proxy.ts re-exports it directly as `proxy`.
// Exported below as `authMiddleware` so proxy.ts keeps using the real thing;
// everywhere else (~40 API routes, Server Components) imports the combined
// `auth` further down instead, which additionally understands Bearer
// tokens.
const {
  handlers,
  auth: authMiddleware,
  signIn,
  signOut
} = NextAuth({
  // Vercel is supposed to be auto-detected as a trusted host, but that
  // detection isn't reliable in this Edge middleware — without this,
  // unauthenticated requests get redirected to a hardcoded
  // `http://localhost:3000/login` instead of this deployment's real host.
  trustHost: true,
  // Band-only app: keep people signed in for a year (default is 30 days).
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 365 },
  pages: {
    signIn: "/login"
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        });

        if (!user) return null;

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!passwordMatch) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (!token) return session;
      Object.assign(
        session.user,
        await buildSessionUser(token.id as string, token.role as string)
      );
      return session;
    },
    // Runs at the proxy/middleware layer (src/proxy.ts) for every matched
    // request. `auth` here is cookie-only (that's all the proxy can see) —
    // a mobile request with just a Bearer token and no cookie would
    // otherwise get redirected to /login before reaching the route handler,
    // so also allow through anything carrying a valid mobile token.
    async authorized({ request, auth: cookieSession }) {
      // A browser's CORS preflight never carries real credentials (that's
      // the whole point of a preflight) — without this, the proxy would
      // redirect the preflight itself to /login, breaking CORS for the
      // mobile app's web target before the real request (which *is*
      // properly checked, same as always) ever gets sent.
      if (request.method === "OPTIONS") return true;
      if (cookieSession) return true;
      if (await hasValidMobileToken(request.headers.get("authorization"))) {
        return true;
      }

      // next-auth's own redirect-when-unauthorized builds the sign-in URL
      // from `request.nextUrl`, but Next.js 16's Proxy runs on the Node.js
      // runtime, and behind Vercel's front door that reports this
      // function's own internal address (localhost:3000) rather than the
      // real public host — bouncing signed-out visitors off-site to a
      // dead end. Build the redirect ourselves from the forwarded headers,
      // which carry the actual host, and return it directly: `authorized`
      // may return a Response instead of a boolean and next-auth will use
      // it as-is instead of building its own.
      const host =
        request.headers.get("x-forwarded-host") ?? request.headers.get("host");
      const proto = request.headers.get("x-forwarded-proto") ?? "https";
      const signInUrl = new URL("/login", `${proto}://${host}`);
      // Relative, not absolute — the login page only follows `callbackUrl`
      // back when it starts with "/" (its guard against open redirects),
      // otherwise it falls back to /calendar and drops the deep link.
      signInUrl.searchParams.set(
        "callbackUrl",
        `${request.nextUrl.pathname}${request.nextUrl.search}`
      );
      return NextResponse.redirect(signInUrl);
    }
  }
});

/**
 * Builds session.user from a user id + role, re-fetching name/email/band
 * memberships fresh from Prisma every call — so creating a band, switching,
 * accepting an invite, a role change, or an /account edit all take effect
 * immediately, with no stale JWT copy to refresh. Shared by the cookie
 * session above and the Bearer-token (mobile) path below, so neither can
 * drift out of sync with the other.
 */
async function buildSessionUser(userId: string, role: string) {
  const [user, memberships] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true }
    }),
    prisma.bandMembership.findMany({
      where: { userId },
      include: { band: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: "asc" }
    })
  ]);
  return {
    id: userId,
    role,
    name: user?.name ?? "",
    email: user?.email ?? "",
    bands: memberships.map((m) => ({
      id: m.band.id,
      name: m.band.name,
      slug: m.band.slug,
      role: m.role
    }))
  };
}

/**
 * Resolves the current request's session from either the NextAuth session
 * cookie (web) or an `Authorization: Bearer <token>` header minted by
 * `POST /api/mobile/login` (native apps, which have no cookie jar). Every
 * existing `import { auth } from "@/auth"` across the API routes keeps
 * calling this exact name, unchanged.
 */
async function auth(): Promise<Session | null> {
  const session = await authMiddleware();
  if (session) return session;

  const mobile = await readMobileToken();
  if (!mobile) return null;

  return {
    user: await buildSessionUser(mobile.id, mobile.role),
    expires: new Date(Date.now() + MOBILE_TOKEN_MAX_AGE * 1000).toISOString()
  };
}

export { handlers, auth, authMiddleware, signIn, signOut };
