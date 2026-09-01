import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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
      availability: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });

  if (!show) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(show);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const body = await request.json();
    const { title, venue, city, state, country, date, doorsTime, setTime, loadInTime, guarantee, notes, status } = body;

    const show = await prisma.show.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(venue && { venue }),
        ...(city && { city }),
        ...(state !== undefined && { state }),
        ...(country && { country }),
        ...(date && { date: new Date(date) }),
        ...(doorsTime !== undefined && { doorsTime: doorsTime ? new Date(doorsTime) : null }),
        ...(setTime !== undefined && { setTime: setTime ? new Date(setTime) : null }),
        ...(loadInTime !== undefined && { loadInTime: loadInTime ? new Date(loadInTime) : null }),
        ...(guarantee !== undefined && { guarantee: guarantee ? parseFloat(guarantee) : null }),
        ...(notes !== undefined && { notes }),
        ...(status && { status }),
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        availability: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    return NextResponse.json(show);
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

  // Only admin or show creator can delete
  const show = await prisma.show.findUnique({ where: { id } });
  if (!show) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role !== "ADMIN" && show.createdById !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.show.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
