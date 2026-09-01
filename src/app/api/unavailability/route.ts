import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const unavailableDates = await prisma.memberUnavailability.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "asc" },
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
