import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessContent, isBandMember } from "@/lib/band";
import { corsPreflight, withCors } from "@/lib/cors";

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}

async function loadSetlist(id: string) {
  return prisma.setlist.findUnique({ where: { id }, select: { bandId: true } });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withCors(request, async () => {
    const session = await auth();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: setlistId } = await params;
    const setlist = await loadSetlist(setlistId);
    if (!setlist || !isBandMember(session, setlist.bandId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!canAccessContent(session, setlist.bandId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
      const { title } = await request.json();
      if (typeof title !== "string" || !title.trim()) {
        return NextResponse.json({ error: "A song title is required" }, { status: 400 });
      }

      const position = await prisma.setlistSong.count({ where: { setlistId } });
      const song = await prisma.setlistSong.create({
        data: { setlistId, title: title.trim(), position }
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

// Reorders every song in one call — the drag-and-drop UI always knows the
// full new order, so this takes the complete list of song ids rather than
// one-at-a-time position patches.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withCors(request, async () => {
    const session = await auth();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: setlistId } = await params;
    const setlist = await loadSetlist(setlistId);
    if (!setlist || !isBandMember(session, setlist.bandId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!canAccessContent(session, setlist.bandId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
      const { songIds } = await request.json();
      if (!Array.isArray(songIds) || songIds.some((s) => typeof s !== "string")) {
        return NextResponse.json({ error: "songIds must be a list of ids" }, { status: 400 });
      }

      await prisma.$transaction(
        songIds.map((songId: string, position: number) =>
          prisma.setlistSong.updateMany({
            where: { id: songId, setlistId },
            data: { position }
          })
        )
      );

      const songs = await prisma.setlistSong.findMany({
        where: { setlistId },
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
