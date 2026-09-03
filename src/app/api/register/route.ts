import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { uniqueBandSlug } from "@/lib/band";
import { normalizeEmail } from "@/lib/invites";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, bandName, inviteToken } = await request.json();
    const cleanEmail = normalizeEmail(email);

    if (!name || !cleanEmail || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (await prisma.user.findUnique({ where: { email: cleanEmail } })) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // --- Joining via an invite ---
    if (inviteToken) {
      const invite = await prisma.bandInvite.findUnique({
        where: { token: inviteToken },
      });
      if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
        return NextResponse.json({ error: "This invite is no longer valid" }, { status: 400 });
      }
      if (invite.email !== cleanEmail) {
        return NextResponse.json(
          { error: `This invite is for ${invite.email}` },
          { status: 400 }
        );
      }

      const user = await prisma.user.create({
        data: {
          name,
          email: cleanEmail,
          password: hashedPassword,
          bandMemberships: { create: { bandId: invite.bandId, role: invite.role } },
        },
        select: { id: true, name: true, email: true },
      });
      await prisma.bandInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });
      return NextResponse.json(user, { status: 201 });
    }

    // --- Starting a fresh band ---
    if (!bandName || !String(bandName).trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const slug = await uniqueBandSlug(String(bandName));
    const user = await prisma.user.create({
      data: {
        name,
        email: cleanEmail,
        password: hashedPassword,
        bandMemberships: {
          create: {
            role: "OWNER",
            band: { create: { name: String(bandName).trim(), slug } },
          },
        },
      },
      select: { id: true, name: true, email: true },
    });
    return NextResponse.json(user, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
