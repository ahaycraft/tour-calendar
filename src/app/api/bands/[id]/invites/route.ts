import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { bandRole } from "@/lib/band";
import { inviteExpiry, isEmail, newInviteToken, normalizeEmail } from "@/lib/invites";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: bandId } = await params;
  const role = bandRole(session, bandId);
  if (role !== "OWNER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const email = normalizeEmail(body.email);
    const inviteRole = body.role === "ADMIN" ? "ADMIN" : "MEMBER";

    if (!isEmail(email)) {
      return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
    }

    const existingMember = await prisma.bandMembership.findFirst({
      where: { bandId, user: { email } },
      select: { id: true },
    });
    if (existingMember) {
      return NextResponse.json(
        { error: "That person is already in the band" },
        { status: 409 }
      );
    }

    const invite = await prisma.bandInvite.upsert({
      where: { bandId_email: { bandId, email } },
      create: {
        bandId,
        email,
        role: inviteRole,
        token: newInviteToken(),
        invitedById: session.user.id,
        expiresAt: inviteExpiry(),
      },
      update: {
        role: inviteRole,
        token: newInviteToken(),
        invitedById: session.user.id,
        expiresAt: inviteExpiry(),
        acceptedAt: null,
      },
      select: { token: true, email: true, role: true, expiresAt: true },
    });

    return NextResponse.json(invite, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
