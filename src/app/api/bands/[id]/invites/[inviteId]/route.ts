import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { bandRole } from "@/lib/band";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; inviteId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: bandId, inviteId } = await params;
  const role = bandRole(session, bandId);
  if (role !== "OWNER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invite = await prisma.bandInvite.findUnique({ where: { id: inviteId } });
  if (!invite || invite.bandId !== bandId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.bandInvite.delete({ where: { id: inviteId } });
  return NextResponse.json({ ok: true });
}
