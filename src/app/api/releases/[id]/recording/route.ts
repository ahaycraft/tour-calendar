import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isBandMember } from "@/lib/band";
import { ensureBandInstruments } from "@/lib/instruments";

async function loadRelease(id: string) {
  return prisma.release.findUnique({
    where: { id },
    select: { id: true, bandId: true, trackingPlan: { select: { id: true } } },
  });
}

// Create the plan for this release (idempotent — returns the existing one).
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const release = await loadRelease(id);
  if (!release || !isBandMember(session, release.bandId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await ensureBandInstruments(release.bandId);

  if (release.trackingPlan) {
    return NextResponse.json({ id: release.trackingPlan.id }, { status: 200 });
  }

  const plan = await prisma.recordingPlan.create({
    data: { releaseId: id, createdById: session.user.id },
    select: { id: true },
  });
  return NextResponse.json(plan, { status: 201 });
}

// Plan-level notes.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const release = await loadRelease(id);
  if (!release || !isBandMember(session, release.bandId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!release.trackingPlan) {
    return NextResponse.json({ error: "No plan yet" }, { status: 404 });
  }

  try {
    const body = await request.json();
    if (typeof body.notes !== "string" && body.notes !== null) {
      return NextResponse.json({ error: "Invalid notes" }, { status: 400 });
    }
    const plan = await prisma.recordingPlan.update({
      where: { id: release.trackingPlan.id },
      data: { notes: body.notes || null },
      select: { id: true, updatedAt: true },
    });
    return NextResponse.json(plan);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
