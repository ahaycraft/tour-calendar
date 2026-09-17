import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";

export const ACTIVE_BAND_COOKIE = "active_band";
// The mobile app has no cookie jar (see src/auth/mobile.ts), so it signals
// its chosen band with this header instead, sent on every authedFetch call
// once the user has picked one. Ignored whenever a session cookie is
// present, so this never affects the web app.
export const ACTIVE_BAND_HEADER = "x-active-band";

export type BandRole =
  | "OWNER"
  | "ADMIN"
  | "MANAGER"
  | "TOUR_MANAGER"
  | "BOOKING_AGENT"
  | "MEMBER";

export interface SessionBand {
  id: string;
  name: string;
  slug: string;
  role: BandRole;
}

/** Roles that can book/edit/approve shows, practices, and recordings. */
const EVENT_MANAGER_ROLES: BandRole[] = [
  "OWNER",
  "ADMIN",
  "MANAGER",
  "TOUR_MANAGER",
  "BOOKING_AGENT"
];


export function userBands(session: Session): SessionBand[] {
  return (session.user.bands ?? []) as SessionBand[];
}

/**
 * The band the user is currently acting in. Hybrid model: list pages and
 * create endpoints use this; detail pages load a record by id and check
 * membership of *that record's* band instead.
 *
 * Resolution: the `active_band` cookie if it names a band the user belongs
 * to, else the `x-active-band` header (the mobile app's equivalent), else
 * their first membership.
 */
export async function getActiveBand(
  session: Session
): Promise<SessionBand | null> {
  const bands = userBands(session);
  if (bands.length === 0) return null;
  const cookieValue = (await cookies()).get(ACTIVE_BAND_COOKIE)?.value;
  const headerValue = (await headers()).get(ACTIVE_BAND_HEADER) ?? undefined;
  const selected = cookieValue ?? headerValue;
  return bands.find((b) => b.id === selected) ?? bands[0];
}

export async function getActiveBandId(
  session: Session
): Promise<string | null> {
  return (await getActiveBand(session))?.id ?? null;
}

/** For server pages: the active band id, or a redirect to band creation. */
export async function requireActiveBandId(session: Session): Promise<string> {
  const id = await getActiveBandId(session);
  if (!id) redirect("/bands/new");
  return id;
}

export function isBandMember(
  session: Session,
  bandId: string | null | undefined
): boolean {
  return !!bandId && userBands(session).some((b) => b.id === bandId);
}

export function bandRole(
  session: Session,
  bandId: string | null | undefined
): SessionBand["role"] | null {
  return userBands(session).find((b) => b.id === bandId)?.role ?? null;
}

/** OWNER/ADMIN in the given band, or the record's creator. Gates songs, releases, and their sub-resources (comments, demos, sections, tracks). */
export function canManage(
  session: Session,
  bandId: string | null | undefined,
  createdById?: string
): boolean {
  const role = bandRole(session, bandId);
  return (
    role === "OWNER" || role === "ADMIN" || session.user.id === createdById
  );
}

/** Owner/Admin/Manager/Tour Manager/Booking Agent, or the record's creator. Gates shows, practices, and recordings. */
export function canManageEvents(
  session: Session,
  bandId: string | null | undefined,
  createdById?: string
): boolean {
  const role = bandRole(session, bandId);
  return (
    (!!role && EVENT_MANAGER_ROLES.includes(role)) ||
    session.user.id === createdById
  );
}

/** Band member who isn't a Booking Agent — Booking Agent has no access to songs/releases at all. */
export function canAccessContent(
  session: Session,
  bandId: string | null | undefined
): boolean {
  return isBandMember(session, bandId) && bandRole(session, bandId) !== "BOOKING_AGENT";
}

/** Owner/Admin/Member can create songs and releases; Manager/Tour Manager are read-only on content, Booking Agent has no access at all. */
export function canCreateContent(
  session: Session,
  bandId: string | null | undefined
): boolean {
  const role = bandRole(session, bandId);
  return role === "OWNER" || role === "ADMIN" || role === "MEMBER";
}

/** Tags each event with whether the current user can delete it, for the list pages. */
export function withDeletePermission<T extends { createdById: string }>(
  events: T[],
  session: Session,
  bandId: string
): (T & { canDelete: boolean })[] {
  return events.map((e) => ({
    ...e,
    canDelete: canManageEvents(session, bandId, e.createdById)
  }));
}

function baseSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 40) || "band"
  );
}

export async function uniqueBandSlug(name: string): Promise<string> {
  const base = baseSlug(name);
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    if (!(await prisma.band.findUnique({ where: { slug: candidate } })))
      return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}
