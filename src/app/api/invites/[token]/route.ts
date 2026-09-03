import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public: the token is the secret. Used by the register form to pre-fill.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const invite = await prisma.bandInvite.findUnique({
    where: { token },
    include: { band: { select: { name: true } } },
  });

  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    return NextResponse.json({ valid: false });
  }

  return NextResponse.json({
    valid: true,
    email: invite.email,
    role: invite.role,
    bandName: invite.band.name,
  });
}
