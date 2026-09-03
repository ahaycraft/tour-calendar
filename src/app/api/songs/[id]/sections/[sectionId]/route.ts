import { NextRequest, NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isBandMember } from "@/lib/band";
import { MAX_SECTION_NAME } from "@/lib/arrangement";

const MAX_TEXT = 20_000;

async function guard(songId: string, sectionId: string, session: Session) {
  const section = await prisma.songSection.findUnique({
    where: { id: sectionId },
    select: { songId: true, song: { select: { bandId: true } } },
  });
  if (
    !section ||
    section.songId !== songId ||
    !isBandMember(session, section.song.bandId)
  ) {
    return false;
  }
  return true;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: songId, sectionId } = await params;
  if (!(await guard(songId, sectionId, session))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { name, notes, lyrics } = body;

    if (name !== undefined && (typeof name !== "string" || !name.trim())) {
      return NextResponse.json({ error: "Name can't be empty" }, { status: 400 });
    }

    const updated = await prisma.songSection.update({
      where: { id: sectionId },
      data: {
        ...(name !== undefined && { name: name.trim().slice(0, MAX_SECTION_NAME) }),
        ...(notes !== undefined && {
          notes: typeof notes === "string" && notes ? notes.slice(0, MAX_TEXT) : null,
        }),
        ...(lyrics !== undefined && {
          lyrics: typeof lyrics === "string" && lyrics ? lyrics.slice(0, MAX_TEXT) : null,
        }),
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: songId, sectionId } = await params;
  if (!(await guard(songId, sectionId, session))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { position } = await prisma.songSection.delete({
    where: { id: sectionId },
    select: { position: true },
  });
  // Close the gap so positions stay contiguous.
  await prisma.songSection.updateMany({
    where: { songId, position: { gt: position } },
    data: { position: { decrement: 1 } },
  });

  return NextResponse.json({ success: true });
}
