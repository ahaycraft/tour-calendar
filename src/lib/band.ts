import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";

export const ACTIVE_BAND_COOKIE = "active_band";

export interface SessionBand {
  id: string;
  name: string;
  slug: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
}

export function userBands(session: Session): SessionBand[] {
  return (session.user.bands ?? []) as SessionBand[];
}

/**
 * The band the user is currently acting in. Hybrid model: list pages and
 * create endpoints use this; detail pages load a record by id and check
 * membership of *that record's* band instead.
 *
 * Resolution: the `active_band` cookie if it names a band the user belongs to,
 * otherwise their first membership.
 */
export async function getActiveBand(session: Session): Promise<SessionBand | null> {
  const bands = userBands(session);
  if (bands.length === 0) return null;
  const selected = (await cookies()).get(ACTIVE_BAND_COOKIE)?.value;
  return bands.find((b) => b.id === selected) ?? bands[0];
}

export async function getActiveBandId(session: Session): Promise<string | null> {
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

/** OWNER/ADMIN in the given band, or the record's creator. */
export function canManage(
  session: Session,
  bandId: string | null | undefined,
  createdById?: string
): boolean {
  const role = bandRole(session, bandId);
  return role === "OWNER" || role === "ADMIN" || session.user.id === createdById;
}

/** Tags each event with whether the current user can delete it, for the list pages. */
export function withDeletePermission<T extends { createdById: string }>(
  events: T[],
  session: Session,
  bandId: string
): (T & { canDelete: boolean })[] {
  return events.map((e) => ({ ...e, canDelete: canManage(session, bandId, e.createdById) }));
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
    if (!(await prisma.band.findUnique({ where: { slug: candidate } }))) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}
