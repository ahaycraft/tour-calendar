import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isBandMember } from "@/lib/band";
import { isRecordingPartStatus } from "@/lib/instruments";

const MAX_LABEL = 80;
const MAX_DESC = 4000;

async function loadPart(releaseId: string, partId: string) {
  const part = await prisma.recordingPart.findUnique({
    where: { id: partId },
    include: { plan: { select: { releaseId: true, release: { select: { bandId: true } } } } },
  });
  if (!part || part.plan.releaseId !== releaseId) return null;
  return part;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; partId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, partId } = await params;
  const part = await loadPart(id, partId);
  if (!part || !isBandMember(session, part.plan.release.bandId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const data: Prisma.RecordingPartUncheckedUpdateInput = {};

    if (body.label !== undefined) {
      data.label =
        typeof body.label === "string" && body.label.trim()
          ? body.label.trim().slice(0, MAX_LABEL)
          : null;
    }
    if (body.description !== undefined) {
      data.description =
        typeof body.description === "string" && body.description.trim()
          ? body.description.slice(0, MAX_DESC)
          : null;
    }
    if (body.status !== undefined) {
      if (!isRecordingPartStatus(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      data.status = body.status;
    }
    if (body.assigneeId !== undefined) {
      const assigneeId =
        typeof body.assigneeId === "string" && body.assigneeId ? body.assigneeId : null;
      if (assigneeId) {
        const member = await prisma.bandMembership.findUnique({
          where: {
            bandId_userId: { bandId: part.plan.release.bandId, userId: assigneeId },
          },
          select: { id: true },
        });
        if (!member) {
          return NextResponse.json({ error: "Unknown assignee" }, { status: 400 });
        }
      }
      data.assigneeId = assigneeId;
    }

    const updated = await prisma.recordingPart.update({
      where: { id: partId },
      data,
      include: {
        instrument: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; partId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, partId } = await params;
  const part = await loadPart(id, partId);
  if (!part || !isBandMember(session, part.plan.release.bandId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.recordingPart.delete({ where: { id: partId } });
  return NextResponse.json({ success: true });
}
