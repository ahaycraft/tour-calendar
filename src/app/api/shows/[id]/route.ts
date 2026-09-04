import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManage, isBandMember } from "@/lib/band";
import { notifyBandMembers } from "@/lib/push";
import { eventHref } from "@/lib/events";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const show = await prisma.show.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true } },
      release: { select: { id: true, title: true } },
      availability: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });

  if (!show || !isBandMember(session, show.bandId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(show);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.show.findUnique({ where: { id } });
  if (!existing || !isBandMember(session, existing.bandId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!canManage(session, existing.bandId, existing.createdById)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { type, title, venue, city, state, country, date, doorsTime, setTime, loadInTime, guarantee, notes, status, venueAddress, venueLat, venueLng, releaseId } = body;

    if (type !== undefined && type !== "SHOW" && type !== "RECORDING") {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
    }

    // Resolve the release link. It only applies to recording sessions, so an
    // event that is (or becomes) a SHOW always has it cleared. A provided
    // release must belong to this event's band.
    const effectiveType = type ?? existing.type;
    let releaseUpdate: { releaseId: string | null } | undefined;
    if (releaseId !== undefined || (type && effectiveType === "SHOW")) {
      if (effectiveType !== "RECORDING" || !releaseId) {
        releaseUpdate = { releaseId: null };
      } else {
        const release = await prisma.release.findFirst({
          where: { id: releaseId, bandId: existing.bandId },
          select: { id: true },
        });
        if (!release) {
          return NextResponse.json({ error: "Release not found" }, { status: 400 });
        }
        releaseUpdate = { releaseId: release.id };
      }
    }

    // Moving the event to a different day invalidates everyone's answer, so
    // their responses are cleared and the band has to confirm again. A
    // confirmed event also drops back to pending, since what was agreed to
    // was the old date.
    const newDate = date ? new Date(date) : null;
    const dateChanged =
      newDate !== null && newDate.getTime() !== existing.date.getTime();
    const revertsToPending = dateChanged && existing.status === "CONFIRMED";

    const show = await prisma.$transaction(async (tx) => {
      if (dateChanged) {
        await tx.showAvailability.deleteMany({ where: { showId: id } });
      }

      return tx.show.update({
        where: { id },
        data: {
          ...(type && { type }),
          ...(title && { title }),
          ...(venue !== undefined && { venue: venue || null }),
          ...(city !== undefined && { city: city || null }),
          ...(state !== undefined && { state }),
          ...(country && { country }),
          ...(newDate && { date: newDate }),
          ...(doorsTime !== undefined && { doorsTime: doorsTime ? new Date(doorsTime) : null }),
          ...(setTime !== undefined && { setTime: setTime ? new Date(setTime) : null }),
          ...(loadInTime !== undefined && { loadInTime: loadInTime ? new Date(loadInTime) : null }),
          ...(guarantee !== undefined && { guarantee: guarantee ? parseFloat(guarantee) : null }),
          ...(notes !== undefined && { notes }),
          ...(releaseUpdate ?? {}),
          ...(status && { status }),
          // Wins over any status in the request body — a moved date always
          // un-confirms the event.
          ...(revertsToPending && { status: "PENDING" as const }),
          ...(venueAddress !== undefined && { venueAddress: venueAddress || null }),
          ...(venueLat !== undefined && {
            venueLat: typeof venueLat === "number" ? venueLat : null,
          }),
          ...(venueLng !== undefined && {
            venueLng: typeof venueLng === "number" ? venueLng : null,
          }),
        },
        include: {
          createdBy: { select: { id: true, name: true } },
          release: { select: { id: true, title: true } },
          availability: {
            include: { user: { select: { id: true, name: true } } },
          },
        },
      });
    });

    // A moved date wipes everyone's answer, so the band needs to re-respond.
    // Otherwise, a fresh drop back to PENDING (an admin un-confirming, or
    // reinstating a cancelled event) is worth a heads-up on its own. The move
    // notification already implies re-confirmation, so the two are exclusive.
    const becamePending =
      show.status === "PENDING" && existing.status !== "PENDING";

    if (dateChanged) {
      void notifyBandMembers(existing.bandId, session.user.id, {
        title: `${show.title} moved to ${format(show.date, "EEE, MMM d")}`,
        body: "Your availability was reset — tap to respond again.",
        url: eventHref(show.type, show.id),
        tag: `show:${show.id}`,
      });
    } else if (becamePending) {
      void notifyBandMembers(existing.bandId, session.user.id, {
        title: `${show.title} set to pending`,
        body: `${format(show.date, "EEE, MMM d")} — waiting on the band to confirm.`,
        url: eventHref(show.type, show.id),
        tag: `show:${show.id}`,
      });
    }

    return NextResponse.json({
      ...show,
      availabilityReset: dateChanged,
      statusReverted: revertsToPending,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const show = await prisma.show.findUnique({ where: { id } });
  if (!show || !isBandMember(session, show.bandId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canManage(session, show.bandId, show.createdById)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.show.delete({ where: { id } });

  // Tell the band the event is gone. There's no detail page left to link to,
  // so this points at the calendar. Its own tag (not the shared `show:<id>`)
  // so it alerts on its own instead of silently replacing the earlier
  // "new event" notification that shares that id.
  void notifyBandMembers(show.bandId, session.user.id, {
    title: `${show.type === "RECORDING" ? "Recording" : "Show"} deleted: ${show.title}`,
    body: `${format(show.date, "EEE, MMM d")} is off the calendar.`,
    url: "/calendar",
    tag: `show-deleted:${show.id}`,
  });

  return NextResponse.json({ success: true });
}
