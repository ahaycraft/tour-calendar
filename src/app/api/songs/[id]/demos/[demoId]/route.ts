import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManage, isBandMember } from "@/lib/band";
import { corsPreflight, withCors } from "@/lib/cors";

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; demoId: string }> }
) {
  return withCors(request, async () => {
    const session = await auth();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: songId, demoId } = await params;

    const demo = await prisma.songDemo.findUnique({
      where: { id: demoId },
      include: { song: { select: { bandId: true } } }
    });

    if (
      !demo ||
      demo.songId !== songId ||
      !isBandMember(session, demo.song.bandId)
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (
      demo.createdById !== session.user.id &&
      !canManage(session, demo.song.bandId)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.songDemo.delete({ where: { id: demoId } });
    return NextResponse.json({ success: true });
  });
}
