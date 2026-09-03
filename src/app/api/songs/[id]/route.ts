import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isSongStatus } from "@/lib/songs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const body = await request.json();
    const { title, status, key, tempo, timeSig, lyrics, notes, samplyUrl } = body;

    if (title !== undefined && (typeof title !== "string" || !title.trim())) {
      return NextResponse.json({ error: "Title can't be empty" }, { status: 400 });
    }
    if (status !== undefined && !isSongStatus(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const tempoValue =
      tempo === undefined
        ? undefined
        : tempo === null || tempo === ""
          ? null
          : Number.isFinite(Number(tempo))
            ? Math.round(Number(tempo))
            : null;

    const song = await prisma.song.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(status !== undefined && { status }),
        ...(key !== undefined && { key: key || null }),
        ...(tempoValue !== undefined && { tempo: tempoValue }),
        ...(timeSig !== undefined && { timeSig: timeSig || null }),
        ...(lyrics !== undefined && { lyrics: lyrics || null }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(samplyUrl !== undefined && { samplyUrl: samplyUrl || null }),
        updatedById: session.user.id,
      },
      select: { id: true, updatedAt: true },
    });

    return NextResponse.json(song);
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

  const song = await prisma.song.findUnique({ where: { id } });
  if (!song) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.user.role !== "ADMIN" && song.createdById !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.song.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
