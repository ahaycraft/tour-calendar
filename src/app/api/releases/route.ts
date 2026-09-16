import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getActiveBandId } from "@/lib/band";
import { isReleaseKind } from "@/lib/releases";
import { corsPreflight, withCors } from "@/lib/cors";

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}

// Mirrors src/app/(protected)/releases/page.tsx's query exactly, so the
// mobile app's list matches the web app's.
export async function GET(request: NextRequest) {
  return withCors(request, async () => {
    const session = await auth();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const bandId = await getActiveBandId(session);
    if (!bandId) return NextResponse.json([]);

    const releases = await prisma.release.findMany({
      where: { bandId },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { tracks: true } } }
    });

    return NextResponse.json(releases);
  });
}

export async function POST(request: NextRequest) {
  return withCors(request, async () => {
    const session = await auth();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
      const { title, kind } = await request.json();
      if (!title || typeof title !== "string" || !title.trim()) {
        return NextResponse.json(
          { error: "A title is required" },
          { status: 400 }
        );
      }
      if (kind !== undefined && !isReleaseKind(kind)) {
        return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
      }

      const bandId = await getActiveBandId(session);
      if (!bandId) {
        return NextResponse.json({ error: "No group selected" }, { status: 400 });
      }

      const release = await prisma.release.create({
        data: {
          bandId,
          title: title.trim(),
          kind: kind ?? "ALBUM",
          createdById: session.user.id
        },
        select: { id: true }
      });

      return NextResponse.json(release, { status: 201 });
    } catch {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}
