import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isBandMember } from "@/lib/band";
import { MAX_SECTION_NAME } from "@/lib/arrangement";

const MAX_TEXT = 20_000;

async function bandForSong(songId: string) {
  const song = await prisma.song.findUnique({
    where: { id: songId },
    select: { bandId: true },
  });
  return song?.bandId ?? null;
}

// Add a section. `afterId` inserts it directly below that section (used for
// both "add below" and "copy" — copy just re-sends the source's text).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: songId } = await params;
  const bandId = await bandForSong(songId);
  if (!bandId || !isBandMember(session, bandId)) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const name =
      typeof body.name === "string" && body.name.trim()
        ? body.name.trim().slice(0, MAX_SECTION_NAME)
        : "Section";
    const notes =
      typeof body.notes === "string" ? body.notes.slice(0, MAX_TEXT) : null;
    const lyrics =
      typeof body.lyrics === "string" ? body.lyrics.slice(0, MAX_TEXT) : null;
    const afterId = typeof body.afterId === "string" ? body.afterId : null;

    const siblings = await prisma.songSection.findMany({
      where: { songId },
      orderBy: { position: "asc" },
      select: { id: true, position: true },
    });

    let position = siblings.length;
    if (afterId) {
      const idx = siblings.findIndex((s) => s.id === afterId);
      if (idx !== -1) position = idx + 1;
    }

    const [, created] = await prisma.$transaction([
      prisma.songSection.updateMany({
        where: { songId, position: { gte: position } },
        data: { position: { increment: 1 } },
      }),
      prisma.songSection.create({
        data: { songId, name, notes, lyrics, position },
      }),
    ]);

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Reorder. Body: { order: string[] } — the full list of section ids in the new
// order. Ids that aren't this song's sections are ignored.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: songId } = await params;
  const bandId = await bandForSong(songId);
  if (!bandId || !isBandMember(session, bandId)) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 });
  }

  try {
    const { order } = await request.json();
    if (!Array.isArray(order) || !order.every((x) => typeof x === "string")) {
      return NextResponse.json({ error: "order must be an array" }, { status: 400 });
    }

    const owned = await prisma.songSection.findMany({
      where: { songId },
      select: { id: true },
    });
    const ownedSet = new Set(owned.map((s) => s.id));
    const finalIds = [...new Set(order)].filter((id) => ownedSet.has(id));

    await prisma.$transaction(
      finalIds.map((id, i) =>
        prisma.songSection.update({ where: { id }, data: { position: i } })
      )
    );

    return NextResponse.json({ count: finalIds.length });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
