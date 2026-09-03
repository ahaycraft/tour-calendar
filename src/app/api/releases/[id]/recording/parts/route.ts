import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isBandMember } from "@/lib/band";

const MAX_LABEL = 80;
const MAX_DESC = 4000;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const release = await prisma.release.findUnique({
    where: { id },
    select: { bandId: true, trackingPlan: { select: { id: true } } },
  });
  if (!release || !isBandMember(session, release.bandId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!release.trackingPlan) {
    return NextResponse.json({ error: "No plan yet" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const songId = typeof body.songId === "string" ? body.songId : "";
    const instrumentId = typeof body.instrumentId === "string" ? body.instrumentId : "";
    const label =
      typeof body.label === "string" && body.label.trim()
        ? body.label.trim().slice(0, MAX_LABEL)
        : null;
    const description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.slice(0, MAX_DESC)
        : null;
    const assigneeId =
      typeof body.assigneeId === "string" && body.assigneeId ? body.assigneeId : null;

    if (!songId || !instrumentId) {
      return NextResponse.json(
        { error: "Pick a song and an instrument" },
        { status: 400 }
      );
    }

    const [track, instrument, assignee] = await Promise.all([
      prisma.releaseTrack.findUnique({
        where: { releaseId_songId: { releaseId: id, songId } },
        select: { id: true },
      }),
      prisma.instrument.findFirst({
        where: { id: instrumentId, bandId: release.bandId },
        select: { id: true },
      }),
      assigneeId
        ? prisma.bandMembership.findUnique({
            where: { bandId_userId: { bandId: release.bandId, userId: assigneeId } },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    if (!track) {
      return NextResponse.json(
        { error: "That song isn't on this release" },
        { status: 400 }
      );
    }
    if (!instrument) {
      return NextResponse.json({ error: "Unknown instrument" }, { status: 400 });
    }
    if (assigneeId && !assignee) {
      return NextResponse.json({ error: "Unknown assignee" }, { status: 400 });
    }

    const max = await prisma.recordingPart.aggregate({
      where: { planId: release.trackingPlan.id, songId },
      _max: { sortOrder: true },
    });

    const part = await prisma.recordingPart.create({
      data: {
        planId: release.trackingPlan.id,
        songId,
        instrumentId,
        label,
        description,
        assigneeId,
        sortOrder: (max._max.sortOrder ?? -1) + 1,
      },
      include: {
        instrument: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(part, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
