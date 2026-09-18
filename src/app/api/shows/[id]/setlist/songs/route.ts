import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessContent, isBandMember } from "@/lib/band";
import { corsPreflight, withCors } from "@/lib/cors";

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}

// Adds a one-off song to the show's own setlist — auto-creates an empty
// ShowSetlist first if the show doesn't have one yet, so a band that
// doesn't use templates can still build a setlist from scratch here
// instead of being forced through POST /api/shows/[id]/setlist first.
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
      const { title } = await request.json();
      if (typeof title !== "string" || !title.trim()) {
        return NextResponse.json({ error: "A song title is required" }, { status: 400 });
      }

      const showSetlist = await prisma.showSetlist.upsert({
        where: { showId },
        create: { showId },
        update: {},
        select: { id: true }
      });
      const position = await prisma.showSetlistSong.count({
        where: { showSetlistId: showSetlist.id }
      });
      const song = await prisma.showSetlistSong.create({
        data: { showSetlistId: showSetlist.id, title: title.trim(), position }
      });
      return NextResponse.json(song, { status: 201 });
    } catch {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
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

    const showSetlist = await prisma.showSetlist.findUnique({
      where: { showId },
      select: { id: true }
    });
    if (!showSetlist) {
      return NextResponse.json({ error: "No setlist for this show" }, { status: 404 });
    }

    try {
      const { songIds } = await request.json();
      if (!Array.isArray(songIds) || songIds.some((s) => typeof s !== "string")) {
        return NextResponse.json({ error: "songIds must be a list of ids" }, { status: 400 });
      }

      await prisma.$transaction(
        songIds.map((songId: string, position: number) =>
          prisma.showSetlistSong.updateMany({
            where: { id: songId, showSetlistId: showSetlist.id },
            data: { position }
          })
        )
      );

      const songs = await prisma.showSetlistSong.findMany({
        where: { showSetlistId: showSetlist.id },
        orderBy: { position: "asc" }
      });
      return NextResponse.json(songs);
    } catch {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}
