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

    const { id: showId } = await params;
    const show = await prisma.show.findUnique({
      where: { id: showId },
      select: { bandId: true }
    });
    if (!show || !isBandMember(session, show.bandId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const setlist = await prisma.showSetlist.findUnique({
      where: { showId },
      include: { songs: { orderBy: { position: "asc" } } }
    });
    return NextResponse.json(setlist);
  });
}

// Applies a template to the show: copies its songs into a fresh
// ShowSetlist, replacing whatever the show already had. See the
// ShowSetlist schema comment for why this is a copy, not a live reference.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withCors(request, async () => {
    const session = await auth();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: showId } = await params;
    const show = await prisma.show.findUnique({
      where: { id: showId },
      select: { bandId: true }
    });
    if (!show || !isBandMember(session, show.bandId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!canAccessContent(session, show.bandId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
      const { setlistId } = await request.json();
      if (typeof setlistId !== "string" || !setlistId) {
        return NextResponse.json({ error: "setlistId is required" }, { status: 400 });
      }

      const template = await prisma.setlist.findUnique({
        where: { id: setlistId },
        include: { songs: { orderBy: { position: "asc" } } }
      });
      if (!template || template.bandId !== show.bandId) {
        return NextResponse.json({ error: "Setlist not found" }, { status: 400 });
      }

      const [, created] = await prisma.$transaction([
        prisma.showSetlist.deleteMany({ where: { showId } }),
        prisma.showSetlist.create({
          data: {
            showId,
            sourceSetlistName: template.name,
            songs: {
              create: template.songs.map((s) => ({
                title: s.title,
                position: s.position
              }))
            }
          },
          include: { songs: { orderBy: { position: "asc" } } }
        })
      ]);

      return NextResponse.json(created, { status: 201 });
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

    const { id: showId } = await params;
    const show = await prisma.show.findUnique({
      where: { id: showId },
      select: { bandId: true }
    });
    if (!show || !isBandMember(session, show.bandId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!canAccessContent(session, show.bandId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.showSetlist.deleteMany({ where: { showId } });
    return NextResponse.json({ ok: true });
  });
}
