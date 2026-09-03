import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const MAX_LEN = 4000;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: songId } = await params;

  try {
    const { body } = await request.json();
    const text = typeof body === "string" ? body.trim() : "";
    if (!text) {
      return NextResponse.json({ error: "Comment can't be empty" }, { status: 400 });
    }
    if (text.length > MAX_LEN) {
      return NextResponse.json({ error: "Comment is too long" }, { status: 400 });
    }

    const song = await prisma.song.findUnique({ where: { id: songId }, select: { id: true } });
    if (!song) return NextResponse.json({ error: "Song not found" }, { status: 404 });

    const comment = await prisma.songComment.create({
      data: { songId, userId: session.user.id, body: text },
      include: { user: { select: { id: true, name: true } } },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: songId } = await params;

  try {
    const { commentId } = await request.json();
    const comment = await prisma.songComment.findUnique({ where: { id: commentId } });

    if (!comment || comment.songId !== songId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (session.user.role !== "ADMIN" && comment.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.songComment.delete({ where: { id: commentId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
