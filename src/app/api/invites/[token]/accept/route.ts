import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ACTIVE_BAND_COOKIE } from "@/lib/band";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await params;
  const invite = await prisma.bandInvite.findUnique({ where: { token } });

  if (!invite) {
    return NextResponse.json({ error: "This invite link is not valid." }, { status: 404 });
  }
  if (invite.acceptedAt) {
    return NextResponse.json(
      { error: "This invite has already been used." },
      { status: 409 }
    );
  }
  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "This invite has expired." }, { status: 410 });
  }
  if (invite.email !== session.user.email.toLowerCase()) {
    return NextResponse.json(
      { error: `This invite was sent to ${invite.email}. Sign in with that address to accept.` },
      { status: 403 }
    );
  }

  await prisma.$transaction([
    prisma.bandMembership.upsert({
      where: { bandId_userId: { bandId: invite.bandId, userId: session.user.id } },
      create: { bandId: invite.bandId, userId: session.user.id, role: invite.role },
      update: {},
    }),
    prisma.bandInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    }),
  ]);

  const res = NextResponse.json({ ok: true, bandId: invite.bandId });
  res.cookies.set(ACTIVE_BAND_COOKIE, invite.bandId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
