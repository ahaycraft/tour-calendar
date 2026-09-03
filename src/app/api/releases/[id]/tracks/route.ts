import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isBandMember } from "@/lib/band";

// Replace a release's tracklist with the given ordered list of song ids.
// The drag-and-drop editor sends the whole array on every change.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: releaseId } = await params;

  try {
    const { songIds } = await request.json();
    if (!Array.isArray(songIds) || !songIds.every((s) => typeof s === "string")) {
      return NextResponse.json({ error: "songIds must be an array" }, { status: 400 });
    }

    const release = await prisma.release.findUnique({
      where: { id: releaseId },
      select: { bandId: true },
    });
    if (!release || !isBandMember(session, release.bandId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Drop dupes, keep order.
    const ordered = [...new Set(songIds)];

    // Only keep ids that are real songs in this release's band.
    const valid = await prisma.song.findMany({
      where: { id: { in: ordered }, bandId: release.bandId },
      select: { id: true },
    });
    const validSet = new Set(valid.map((s) => s.id));
    const finalIds = ordered.filter((s) => validSet.has(s));

    await prisma.$transaction([
      prisma.releaseTrack.deleteMany({ where: { releaseId } }),
      prisma.releaseTrack.createMany({
        data: finalIds.map((songId, i) => ({ releaseId, songId, position: i })),
      }),
    ]);

    return NextResponse.json({ count: finalIds.length });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
