import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getActiveBandId } from "@/lib/band";
import { sendPushToUsers } from "@/lib/push";
import { eventHref } from "@/lib/events";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bandId = await getActiveBandId(session);
  if (!bandId) return NextResponse.json([]);

  const shows = await prisma.show.findMany({
    where: { bandId },
    orderBy: { date: "asc" },
    include: {
      createdBy: { select: { id: true, name: true } },
      availability: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });

  return NextResponse.json(shows);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { type, title, venue, city, state, country, date, doorsTime, setTime, loadInTime, guarantee, notes, venueAddress, venueLat, venueLng, releaseId } = body;

    // Venue and city are optional so skeleton events (e.g. a bulk-created tour
    // run) can be saved before the routing is booked.
    if (!title || !date) {
      return NextResponse.json({ error: "Title and date are required" }, { status: 400 });
    }

    if (type !== undefined && type !== "SHOW" && type !== "RECORDING") {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
    }

    const bandId = await getActiveBandId(session);
    if (!bandId) {
      return NextResponse.json({ error: "No band selected" }, { status: 400 });
    }

    // A release link only applies to recording sessions, and the release must
    // belong to the same band.
    const effectiveType = type ?? "SHOW";
    let resolvedReleaseId: string | null = null;
    if (releaseId && effectiveType === "RECORDING") {
      const release = await prisma.release.findFirst({
        where: { id: releaseId, bandId },
        select: { id: true },
      });
      if (!release) {
        return NextResponse.json({ error: "Release not found" }, { status: 400 });
      }
      resolvedReleaseId = release.id;
    }

    const show = await prisma.show.create({
      data: {
        bandId,
        type: effectiveType,
        releaseId: resolvedReleaseId,
        title,
        venue: venue || null,
        city: city || null,
        state: state || null,
        country: country || "US",
        date: new Date(date),
        doorsTime: doorsTime ? new Date(doorsTime) : null,
        setTime: setTime ? new Date(setTime) : null,
        loadInTime: loadInTime ? new Date(loadInTime) : null,
        guarantee: guarantee ? parseFloat(guarantee) : null,
        notes: notes || null,
        venueAddress: venueAddress || null,
        venueLat: typeof venueLat === "number" ? venueLat : null,
        venueLng: typeof venueLng === "number" ? venueLng : null,
        createdById: session.user.id,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        availability: true,
      },
    });

    // Notify the rest of the band. The app treats a missing/PENDING availability
    // row as "owes a response", so this doubles as the pending-availability alert.
    const members = await prisma.bandMembership.findMany({
      where: { bandId, userId: { not: session.user.id } },
      select: { userId: true },
    });
    void sendPushToUsers(
      members.map((m) => m.userId),
      {
        title: `New ${effectiveType === "RECORDING" ? "recording" : "show"}: ${show.title}`,
        body: "Tap to set your availability.",
        url: eventHref(effectiveType, show.id),
        tag: `show:${show.id}`,
      }
    );

    return NextResponse.json(show, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
