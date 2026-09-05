import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getActiveBandId } from "@/lib/band";

const MAX_RANGE_DAYS = 180;

/** "2026-09-01".."2026-09-03" -> ["2026-09-01", "2026-09-02", "2026-09-03"]. */
function eachDateString(startStr: string, endStr: string): string[] {
  const start = new Date(`${startStr}T00:00:00Z`).getTime();
  const end = new Date(`${endStr}T00:00:00Z`).getTime();
  const dates: string[] = [];
  for (let t = start; t <= end; t += 24 * 60 * 60 * 1000) {
    dates.push(new Date(t).toISOString().slice(0, 10));
  }
  return dates;
}

// Returns unavailability for every member of the active band (not just the
// caller) so the calendar can show who is blocked on a given day. `from`/`to`
// scope this to the calendar's visible range (`to` exclusive), matching
// GET /api/shows — otherwise this grows without bound as members block dates.
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bandId = await getActiveBandId(session);
  if (!bandId) return NextResponse.json([]);

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  if (!fromParam || !toParam) {
    return NextResponse.json({ error: "from and to are required" }, { status: 400 });
  }
  const from = new Date(`${fromParam}T00:00:00Z`);
  const to = new Date(`${toParam}T00:00:00Z`);
  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return NextResponse.json({ error: "Invalid from or to date" }, { status: 400 });
  }

  const unavailableDates = await prisma.memberUnavailability.findMany({
    where: {
      date: { gte: from, lt: to },
      user: { bandMemberships: { some: { bandId } } },
    },
    orderBy: { date: "asc" },
    include: { user: { select: { id: true, name: true } } },
  });

  return NextResponse.json(unavailableDates);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { date, endDate, note } = await request.json();

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    const dates: string[] = endDate ? eachDateString(date, endDate) : [date];

    if (dates.length === 0) {
      return NextResponse.json(
        { error: "End date must be on or after the start date" },
        { status: 400 }
      );
    }
    if (dates.length > MAX_RANGE_DAYS) {
      return NextResponse.json(
        { error: `Ranges are limited to ${MAX_RANGE_DAYS} days` },
        { status: 400 }
      );
    }

    // One row per day — a range is just several single-day rows sharing a note.
    const records = await Promise.all(
      dates.map((d) =>
        prisma.memberUnavailability.upsert({
          where: {
            userId_date: {
              userId: session.user.id,
              date: new Date(d),
            },
          },
          create: {
            userId: session.user.id,
            date: new Date(d),
            note: note || null,
          },
          update: {
            note: note !== undefined ? note : undefined,
          },
          include: { user: { select: { id: true, name: true } } },
        })
      )
    );

    return NextResponse.json(records, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { date } = await request.json();

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    await prisma.memberUnavailability.delete({
      where: {
        userId_date: {
          userId: session.user.id,
          date: new Date(date),
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Not found or could not delete" }, { status: 404 });
  }
}
