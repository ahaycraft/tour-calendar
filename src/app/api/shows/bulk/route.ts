import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getActiveBandId, canManage, isBandMember } from "@/lib/band";
import { notifyBandMembers } from "@/lib/push";
import { isEventType } from "@/lib/events";

const MAX_EVENTS = 90;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = ["PENDING", "CONFIRMED", "CANCELLED"] as const;

/** What a multi-day block of each type is called in notifications. */
const BLOCK_LABEL: Record<string, string> = {
  SHOW: "tour",
  RECORDING: "recording block",
  PRACTICE: "practice block",
};
const blockLabel = (type: string) => BLOCK_LABEL[type] ?? "tour";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { type, name, dates, city, state, country } = await request.json();

    if (type !== undefined && !isEventType(type)) {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
    }
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "A name is required" }, { status: 400 });
    }
    if (!Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json({ error: "Pick at least one date" }, { status: 400 });
    }
    if (dates.length > MAX_EVENTS) {
      return NextResponse.json(
        { error: `Too many dates — ${MAX_EVENTS} max per batch` },
        { status: 400 }
      );
    }
    if (!dates.every((d: unknown) => typeof d === "string" && DATE_RE.test(d))) {
      return NextResponse.json({ error: "Invalid date in range" }, { status: 400 });
    }

    const bandId = await getActiveBandId(session);
    if (!bandId) {
      return NextResponse.json({ error: "No band selected" }, { status: 400 });
    }

    const sorted = [...new Set(dates as string[])].sort();
    const label = name.trim();
    const effectiveType = type ?? "SHOW";

    // Every day of the block shares this id so it can be edited as a unit later.
    const tourGroupId = crypto.randomUUID();

    const created = await prisma.show.createManyAndReturn({
      data: sorted.map((d, i) => ({
        bandId,
        type: effectiveType,
        title: `${label} — Day ${i + 1}`,
        venue: null,
        city: city || null,
        state: state || null,
        country: country || "US",
        date: new Date(`${d}T00:00:00`),
        createdById: session.user.id,
        tourGroupId,
        tourName: label,
      })),
      select: { id: true },
    });

    // One summary push for the whole batch — a per-day notification would be a
    // storm of up to MAX_EVENTS. The tour:<groupId> tag is reused by later
    // block-wide edits so each new one supersedes it.
    void notifyBandMembers(bandId, session.user.id, {
      title: `New ${blockLabel(effectiveType)}: ${label}`,
      body: `${created.length} ${created.length === 1 ? "day" : "days"} added — tap to set your availability.`,
      url: "/calendar",
      tag: `tour:${tourGroupId}`,
    });

    return NextResponse.json(
      { count: created.length, ids: created.map((s) => s.id), tourGroupId },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Edit a whole tour / recording block at once: the fields that are shared
 * across every day (name, location, status, notes). Per-day details — date,
 * venue, set times, guarantee — stay on the individual-event PATCH.
 */
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { tourGroupId, name, city, state, country, status, notes } = body;

    if (!tourGroupId || typeof tourGroupId !== "string") {
      return NextResponse.json({ error: "tourGroupId is required" }, { status: 400 });
    }
    if (status !== undefined && !STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    if (
      name !== undefined &&
      (typeof name !== "string" || !name.trim())
    ) {
      return NextResponse.json({ error: "A name is required" }, { status: 400 });
    }

    const events = await prisma.show.findMany({
      where: { tourGroupId },
      orderBy: { date: "asc" },
    });
    if (events.length === 0) {
      return NextResponse.json({ error: "Tour not found" }, { status: 404 });
    }

    const { bandId, createdById } = events[0];
    if (!isBandMember(session, bandId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!canManage(session, bandId, createdById)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // The form re-sends every field on each save, so compare against what's
    // already stored and only write / announce the ones that actually moved.
    const current = events[0];
    const label = typeof name === "string" ? name.trim() : undefined;

    const shared: {
      city?: string | null;
      state?: string | null;
      country?: string;
      status?: (typeof STATUSES)[number];
      notes?: string | null;
    } = {};
    const changes: string[] = [];

    const renamed = label !== undefined && label !== (current.tourName ?? "");
    if (renamed) changes.push("renamed");

    if (city !== undefined && (city || null) !== current.city) {
      shared.city = city || null;
    }
    if (state !== undefined && (state || null) !== current.state) {
      shared.state = state || null;
    }
    if (country !== undefined && (country.trim() || "US") !== current.country) {
      shared.country = country.trim() || "US";
    }
    if (
      "city" in shared ||
      "state" in shared ||
      "country" in shared
    ) {
      changes.push("location updated");
    }
    if (status !== undefined && status !== current.status) {
      shared.status = status;
      changes.push(`marked ${status.toLowerCase()}`);
    }
    if (notes !== undefined && (notes || null) !== current.notes) {
      shared.notes = notes || null;
      changes.push("notes updated");
    }

    if (changes.length === 0) {
      return NextResponse.json({ count: events.length, tourGroupId, changed: false });
    }

    await prisma.$transaction([
      ...(Object.keys(shared).length > 0
        ? [prisma.show.updateMany({ where: { tourGroupId }, data: shared })]
        : []),
      // A rename re-titles each day in date order ("<name> — Day N") and updates
      // the stored label, so it needs a write per row.
      ...(renamed
        ? events.map((e, i) =>
            prisma.show.update({
              where: { id: e.id },
              data: { title: `${label} — Day ${i + 1}`, tourName: label },
            })
          )
        : []),
    ]);

    const finalName = renamed ? label! : current.tourName ?? "tour";
    const noun = blockLabel(current.type);
    const summary = `${changes.join(", ")}.`;

    void notifyBandMembers(bandId, session.user.id, {
      title: `${noun[0].toUpperCase() + noun.slice(1)} updated: ${finalName}`,
      body: summary[0].toUpperCase() + summary.slice(1),
      url: "/calendar",
      tag: `tour:${tourGroupId}`,
    });

    return NextResponse.json({ count: events.length, tourGroupId, changed: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
