import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isBandMember } from "@/lib/band";

const MAX_NAME = 60;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const instrument = await prisma.instrument.findUnique({ where: { id } });
  if (!instrument || !isBandMember(session, instrument.bandId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const data: { name?: string; archived?: boolean } = {};

    if (body.name !== undefined) {
      const name = typeof body.name === "string" ? body.name.trim().slice(0, MAX_NAME) : "";
      if (!name) {
        return NextResponse.json({ error: "Name can't be empty" }, { status: 400 });
      }
      const clash = await prisma.instrument.findFirst({
        where: { bandId: instrument.bandId, name, id: { not: id } },
        select: { id: true },
      });
      if (clash) {
        return NextResponse.json(
          { error: "Another instrument already has that name" },
          { status: 409 }
        );
      }
      data.name = name;
    }
    if (typeof body.archived === "boolean") {
      data.archived = body.archived;
    }

    const updated = await prisma.instrument.update({
      where: { id },
      data,
      select: { id: true, name: true, sortOrder: true, archived: true },
    });
    return NextResponse.json(updated);
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
  const instrument = await prisma.instrument.findUnique({
    where: { id },
    include: { _count: { select: { parts: true } } },
  });
  if (!instrument || !isBandMember(session, instrument.bandId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Something still points at it — archive instead of orphaning parts.
  if (instrument._count.parts > 0) {
    const updated = await prisma.instrument.update({
      where: { id },
      data: { archived: true },
      select: { id: true, archived: true },
    });
    return NextResponse.json({ ...updated, archivedInsteadOfDeleted: true });
  }

  await prisma.instrument.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
