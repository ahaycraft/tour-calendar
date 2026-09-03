import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getActiveBandId } from "@/lib/band";
import { isSongStatus } from "@/lib/songs";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { title, status } = await request.json();

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "A title is required" }, { status: 400 });
    }
    if (status !== undefined && !isSongStatus(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const bandId = await getActiveBandId(session);
    if (!bandId) {
      return NextResponse.json({ error: "No band selected" }, { status: 400 });
    }

    const song = await prisma.song.create({
      data: {
        bandId,
        title: title.trim(),
        status: status ?? "IDEA",
        createdById: session.user.id,
        updatedById: session.user.id,
      },
      select: { id: true },
    });

    return NextResponse.json(song, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
