import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessContent, isBandMember } from "@/lib/band";
import { corsPreflight, withCors } from "@/lib/cors";

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; songId: string }> }
) {
  return withCors(request, async () => {
    const session = await auth();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: showId, songId } = await params;
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

    const song = await prisma.showSetlistSong.findUnique({
      where: { id: songId },
      select: { showSetlist: { select: { showId: true } } }
    });
    if (!song || song.showSetlist.showId !== showId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.showSetlistSong.delete({ where: { id: songId } });
    return NextResponse.json({ ok: true });
  });
}
