import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isReleaseKind, isReleaseStatus } from "@/lib/releases";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const body = await request.json();
    const { title, kind, status, targetDate, notes } = body;

    if (title !== undefined && (typeof title !== "string" || !title.trim())) {
      return NextResponse.json({ error: "Title can't be empty" }, { status: 400 });
    }
    if (kind !== undefined && !isReleaseKind(kind)) {
      return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
    }
    if (status !== undefined && !isReleaseStatus(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const release = await prisma.release.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(kind !== undefined && { kind }),
        ...(status !== undefined && { status }),
        ...(targetDate !== undefined && {
          targetDate: targetDate ? new Date(`${targetDate}T00:00:00Z`) : null,
        }),
        ...(notes !== undefined && { notes: notes || null }),
      },
      select: { id: true, updatedAt: true },
    });

    return NextResponse.json(release);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const release = await prisma.release.findUnique({ where: { id } });
  if (!release) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.user.role !== "ADMIN" && release.createdById !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.release.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
