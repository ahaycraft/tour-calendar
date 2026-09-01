import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const shows = await prisma.show.findMany({
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
    const { title, venue, city, state, country, date, doorsTime, setTime, loadInTime, guarantee, notes } = body;

    if (!title || !venue || !city || !date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const show = await prisma.show.create({
      data: {
        title,
        venue,
        city,
        state: state || null,
        country: country || "US",
        date: new Date(date),
        doorsTime: doorsTime ? new Date(doorsTime) : null,
        setTime: setTime ? new Date(setTime) : null,
        loadInTime: loadInTime ? new Date(loadInTime) : null,
        guarantee: guarantee ? parseFloat(guarantee) : null,
        notes: notes || null,
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
