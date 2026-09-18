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

    const { id: setlistId, songId } = await params;
    const song = await prisma.setlistSong.findUnique({
      where: { id: songId },
      select: { setlistId: true, setlist: { select: { bandId: true } } }
    });
    if (!song || song.setlistId !== setlistId || !isBandMember(session, song.setlist.bandId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!canAccessContent(session, song.setlist.bandId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.setlistSong.delete({ where: { id: songId } });
    return NextResponse.json({ ok: true });
  });
}
