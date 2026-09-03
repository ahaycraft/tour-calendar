import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getActiveBandId } from "@/lib/band";

// Returns unavailability for every member of the active band (not just the
// caller) so the calendar can show who is blocked on a given day.
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bandId = await getActiveBandId(session);
  if (!bandId) return NextResponse.json([]);

  const unavailableDates = await prisma.memberUnavailability.findMany({
    where: { user: { bandMemberships: { some: { bandId } } } },
    orderBy: { date: "asc" },
    include: { user: { select: { id: true, name: true } } },
  });

  return NextResponse.json(unavailableDates);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { date, note } = await request.json();

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    const record = await prisma.memberUnavailability.upsert({
      where: {
        userId_date: {
          userId: session.user.id,
          date: new Date(date),
        },
      },
      create: {
        userId: session.user.id,
        date: new Date(date),
        note: note || null,
      },
      update: {
        note: note !== undefined ? note : undefined,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    return NextResponse.json(record, { status: 201 });
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
