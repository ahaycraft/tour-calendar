import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getActiveBandId } from "@/lib/band";
import { ensureBandInstruments } from "@/lib/instruments";

const MAX_NAME = 60;

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bandId = await getActiveBandId(session);
  if (!bandId) return NextResponse.json([]);

  await ensureBandInstruments(bandId);
  const instruments = await prisma.instrument.findMany({
    where: { bandId, archived: false },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, sortOrder: true },
  });
  return NextResponse.json(instruments);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bandId = await getActiveBandId(session);
  if (!bandId) {
    return NextResponse.json({ error: "No band selected" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim().slice(0, MAX_NAME) : "";
    if (!name) {
      return NextResponse.json({ error: "Name the instrument" }, { status: 400 });
    }

    // Revive an archived one with the same name rather than colliding on the
    // unique index.
    const existing = await prisma.instrument.findUnique({
      where: { bandId_name: { bandId, name } },
    });
    if (existing) {
      const instrument = existing.archived
        ? await prisma.instrument.update({
            where: { id: existing.id },
            data: { archived: false },
            select: { id: true, name: true, sortOrder: true },
          })
        : { id: existing.id, name: existing.name, sortOrder: existing.sortOrder };
      return NextResponse.json(instrument, { status: 200 });
    }

    const max = await prisma.instrument.aggregate({
      where: { bandId },
      _max: { sortOrder: true },
    });
    const instrument = await prisma.instrument.create({
      data: { bandId, name, sortOrder: (max._max.sortOrder ?? -1) + 1 },
      select: { id: true, name: true, sortOrder: true },
    });
    return NextResponse.json(instrument, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
