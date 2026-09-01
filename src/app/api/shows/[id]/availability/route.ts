import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: showId } = await params;

  try {
    const { status, note } = await request.json();

    if (!["AVAILABLE", "UNAVAILABLE", "PENDING"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const availability = await prisma.showAvailability.upsert({
      where: {
        userId_showId: {
          userId: session.user.id,
          showId,
        },
      },
      create: {
        userId: session.user.id,
        showId,
        status,
        note: note || null,
      },
      update: {
        status,
        note: note !== undefined ? note : undefined,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(availability);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
