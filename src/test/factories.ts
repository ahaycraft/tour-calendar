import type { Session } from "next-auth";

/**
 * Test doubles for the route-handler suites. These build the plain shapes the
 * handlers actually read — not full Prisma / next-auth objects.
 */

type Role = "OWNER" | "ADMIN" | "MEMBER";

export function makeSession(
  opts: { userId?: string; bands?: { id: string; role: Role }[] } = {}
): Session {
  const { userId = "u1", bands = [{ id: "band1", role: "OWNER" }] } = opts;
  return {
    user: {
      id: userId,
      name: "Test User",
      email: "test@example.com",
      bands: bands.map((b) => ({
        id: b.id,
        name: b.id,
        slug: b.id,
        role: b.role,
      })),
    },
  } as unknown as Session;
}

export interface FakeShow {
  id: string;
  type: "SHOW" | "RECORDING" | "PRACTICE";
  title: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  date: Date;
  bandId: string;
  createdById: string;
  tourGroupId: string | null;
  tourName: string | null;
  city: string | null;
  state: string | null;
  country: string;
  notes: string | null;
}

export function makeShow(overrides: Partial<FakeShow> = {}): FakeShow {
  return {
    id: "show1",
    type: "SHOW",
    title: "The Roxy",
    status: "PENDING",
    date: new Date("2026-06-15T00:00:00Z"),
    bandId: "band1",
    createdById: "u1",
    tourGroupId: null,
    tourName: null,
    city: null,
    state: null,
    country: "US",
    notes: null,
    ...overrides,
  };
}

/** A stand-in for NextRequest that only answers `.json()`, which is all the
 *  handlers use. */
export function jsonRequest(body: unknown): {
  json: () => Promise<unknown>;
} {
  return { json: async () => body };
}

/** `{ params }` context for a dynamic `[id]` route handler. */
export function routeCtx(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

/** A stand-in for NextRequest that only answers `.url`, for GET handlers that
 *  read query params via `new URL(request.url)`. */
export function urlRequest(url: string): { url: string } {
  return { url: `http://localhost${url}` };
}
