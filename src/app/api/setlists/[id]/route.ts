import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessContent, isBandMember } from "@/lib/band";
import { corsPreflight, withCors } from "@/lib/cors";

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withCors(request, async () => {
    const session = await auth();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const setlist = await prisma.setlist.findUnique({
      where: { id },
      include: { songs: { orderBy: { position: "asc" } } }
    });
    if (!setlist || !isBandMember(session, setlist.bandId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(setlist);
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withCors(request, async () => {
    const session = await auth();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const existing = await prisma.setlist.findUnique({
      where: { id },
      select: { bandId: true }
    });
    if (!existing || !isBandMember(session, existing.bandId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!canAccessContent(session, existing.bandId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
      const { name } = await request.json();
      if (typeof name !== "string" || !name.trim()) {
        return NextResponse.json({ error: "A name is required" }, { status: 400 });
      }

      const setlist = await prisma.setlist.update({
        where: { id },
        data: { name: name.trim() },
        select: { id: true, name: true }
      });
      return NextResponse.json(setlist);
    } catch {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withCors(request, async () => {
    const session = await auth();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const existing = await prisma.setlist.findUnique({
      where: { id },
      select: { bandId: true }
    });
    if (!existing || !isBandMember(session, existing.bandId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!canAccessContent(session, existing.bandId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.setlist.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
