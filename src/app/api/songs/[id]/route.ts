import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManage, isBandMember } from "@/lib/band";
import { isSongStatus } from "@/lib/songs";
import { corsPreflight, withCors } from "@/lib/cors";

// Mirrors src/app/(protected)/songs/[id]/page.tsx's query exactly, so the
// mobile app's detail view matches the web app's.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withCors(request, async () => {
    const session = await auth();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const song = await prisma.song.findUnique({
      where: { id },
      include: {
        createdBy: { select: { name: true } },
        updatedBy: { select: { name: true } },
        demos: {
          orderBy: { createdAt: "desc" },
          include: { createdBy: { select: { name: true } } }
        },
        tracks: {
          include: { release: { select: { id: true, title: true } } }
        },
        comments: {
          orderBy: { createdAt: "asc" },
          include: { user: { select: { id: true, name: true } } }
        },
        sections: { orderBy: { position: "asc" } }
      }
    });

    if (!song || !isBandMember(session, song.bandId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(song);
  });
}

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
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

    const existing = await prisma.song.findUnique({
      where: { id },
      select: { bandId: true }
    });
    if (!existing || !isBandMember(session, existing.bandId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    try {
      const body = await request.json();
      const {
        title,
        status,
        key,
        tempo,
        timeSig,
        duration,
        lyrics,
        notes,
        samplyUrl
      } = body;

      if (title !== undefined && (typeof title !== "string" || !title.trim())) {
        return NextResponse.json(
          { error: "Title can't be empty" },
          { status: 400 }
        );
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

      const durationValue =
        duration === undefined
          ? undefined
          : duration === null || duration === ""
            ? null
            : Number.isFinite(Number(duration)) && Number(duration) >= 0
              ? Math.round(Number(duration))
              : null;

      const song = await prisma.song.update({
        where: { id },
        data: {
          ...(title !== undefined && { title: title.trim() }),
          ...(status !== undefined && { status }),
          ...(key !== undefined && { key: key || null }),
          ...(tempoValue !== undefined && { tempo: tempoValue }),
          ...(timeSig !== undefined && { timeSig: timeSig || null }),
          ...(durationValue !== undefined && { duration: durationValue }),
          ...(lyrics !== undefined && { lyrics: lyrics || null }),
          ...(notes !== undefined && { notes: notes || null }),
          ...(samplyUrl !== undefined && { samplyUrl: samplyUrl || null }),
          updatedById: session.user.id
        },
        select: { id: true, updatedAt: true }
      });

      return NextResponse.json(song);
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

    const song = await prisma.song.findUnique({ where: { id } });
    if (!song || !isBandMember(session, song.bandId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!canManage(session, song.bandId, song.createdById)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.song.delete({ where: { id } });
    return NextResponse.json({ success: true });
  });
}
