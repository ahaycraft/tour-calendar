import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isBandMember } from "@/lib/band";

const MAX_URL = 2000;
const MAX_LABEL = 120;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: songId } = await params;

  try {
    const body = await request.json();
    const url = typeof body.url === "string" ? body.url.trim() : "";
    const label =
      typeof body.label === "string" && body.label.trim()
        ? body.label.trim().slice(0, MAX_LABEL)
        : null;

    if (!url) {
      return NextResponse.json({ error: "Add a link" }, { status: 400 });
    }
    if (url.length > MAX_URL) {
      return NextResponse.json({ error: "That link is too long" }, { status: 400 });
    }

    const song = await prisma.song.findUnique({
      where: { id: songId },
      select: { bandId: true },
    });
    if (!song || !isBandMember(session, song.bandId)) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    const demo = await prisma.songDemo.create({
      data: { songId, url, label, createdById: session.user.id },
      include: { createdBy: { select: { name: true } } },
    });

    return NextResponse.json(demo, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
