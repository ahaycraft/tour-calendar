import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getActiveBandId } from "@/lib/band";
import { isSongStatus } from "@/lib/songs";
import { corsPreflight, withCors } from "@/lib/cors";

// Mirrors src/app/(protected)/songs/page.tsx's query exactly, so the
// mobile app's list matches the web app's.
export async function GET(request: NextRequest) {
  return withCors(request, async () => {
    const session = await auth();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const bandId = await getActiveBandId(session);
    if (!bandId) return NextResponse.json([]);

    const songs = await prisma.song.findMany({
      where: { bandId },
      orderBy: { updatedAt: "desc" },
      include: {
        createdBy: { select: { name: true } },
        _count: { select: { comments: true } },
        tracks: {
          include: { release: { select: { id: true, title: true } } }
        }
      }
    });

    return NextResponse.json(songs);
  });
}

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}

export async function POST(request: NextRequest) {
  return withCors(request, async () => {
    const session = await auth();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
      const { title, status } = await request.json();

      if (!title || typeof title !== "string" || !title.trim()) {
        return NextResponse.json(
          { error: "A title is required" },
          { status: 400 }
        );
      }
      if (status !== undefined && !isSongStatus(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }

      const bandId = await getActiveBandId(session);
      if (!bandId) {
        return NextResponse.json(
          { error: "No group selected" },
          { status: 400 }
        );
      }

      const song = await prisma.song.create({
        data: {
          bandId,
          title: title.trim(),
          status: status ?? "IDEA",
          createdById: session.user.id,
          updatedById: session.user.id
        },
        select: { id: true }
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
