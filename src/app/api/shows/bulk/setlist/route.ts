import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageEvents, isBandMember } from "@/lib/band";
import { corsPreflight, withCors } from "@/lib/cors";

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}

// Applies one template to every show in a tour/practice/recording block at
// once — the same copy-in behavior as POST /api/shows/[id]/setlist, just
// fanned out across the whole tourGroupId instead of one show.
export async function POST(request: NextRequest) {
  return withCors(request, async () => {
    const session = await auth();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
      const { tourGroupId, setlistId } = await request.json();
      if (!tourGroupId || typeof tourGroupId !== "string") {
        return NextResponse.json({ error: "tourGroupId is required" }, { status: 400 });
      }
      if (!setlistId || typeof setlistId !== "string") {
        return NextResponse.json({ error: "setlistId is required" }, { status: 400 });
      }

      const shows = await prisma.show.findMany({
        where: { tourGroupId },
        select: { id: true, bandId: true, createdById: true }
      });
      if (shows.length === 0) {
        return NextResponse.json({ error: "Tour not found" }, { status: 404 });
      }

      const { bandId, createdById } = shows[0];
      if (!isBandMember(session, bandId)) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (!canManageEvents(session, bandId, createdById)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const template = await prisma.setlist.findUnique({
        where: { id: setlistId },
        include: { songs: { orderBy: { position: "asc" } } }
      });
      if (!template || template.bandId !== bandId) {
        return NextResponse.json({ error: "Setlist not found" }, { status: 400 });
      }

      const showIds = shows.map((s) => s.id);
      await prisma.$transaction([
        prisma.showSetlist.deleteMany({ where: { showId: { in: showIds } } }),
        ...showIds.map((showId) =>
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
            }
          })
        )
      ]);

      return NextResponse.json({ count: showIds.length });
    } catch {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}
