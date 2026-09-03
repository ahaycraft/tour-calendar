import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getActiveBandId } from "@/lib/band";

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
    const { type, title, venue, city, state, country, date, doorsTime, setTime, loadInTime, guarantee, notes, venueAddress, venueLat, venueLng } = body;

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

    const show = await prisma.show.create({
      data: {
        bandId,
        type: type ?? "SHOW",
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

    return NextResponse.json(show, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
