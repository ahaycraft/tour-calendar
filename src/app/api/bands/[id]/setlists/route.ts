import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessContent, isBandMember } from "@/lib/band";
import { corsPreflight, withCors } from "@/lib/cors";

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}

// The band's reusable setlist templates (not a show's own copy — see
// GET /api/shows/[id]/setlist for that).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withCors(request, async () => {
    const session = await auth();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: bandId } = await params;
    if (!isBandMember(session, bandId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const setlists = await prisma.setlist.findMany({
      where: { bandId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, _count: { select: { songs: true } } }
    });

    return NextResponse.json(setlists);
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withCors(request, async () => {
    const session = await auth();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: bandId } = await params;
    if (!canAccessContent(session, bandId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
      const { name } = await request.json();
      if (typeof name !== "string" || !name.trim()) {
        return NextResponse.json({ error: "A name is required" }, { status: 400 });
      }

      const setlist = await prisma.setlist.create({
        data: { bandId, name: name.trim() },
        select: { id: true, name: true }
      });
      return NextResponse.json(setlist, { status: 201 });
    } catch {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}
