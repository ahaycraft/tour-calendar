import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { bandRole } from "@/lib/band";

const ROLES = ["OWNER", "ADMIN", "MEMBER"] as const;

async function ownerCount(bandId: string) {
  return prisma.bandMembership.count({ where: { bandId, role: "OWNER" } });
}

// Change a member's role.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: bandId, userId } = await params;
  if (bandRole(session, bandId) !== "OWNER") {
    return NextResponse.json({ error: "Only an owner can change roles" }, { status: 403 });
  }

  const { role } = await request.json();
  if (!ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const target = await prisma.bandMembership.findUnique({
    where: { bandId_userId: { bandId, userId } },
  });
  if (!target) return NextResponse.json({ error: "Not a member" }, { status: 404 });

  if (target.role === "OWNER" && role !== "OWNER" && (await ownerCount(bandId)) <= 1) {
    return NextResponse.json(
      { error: "A band needs at least one owner" },
      { status: 400 }
    );
  }

  await prisma.bandMembership.update({
    where: { bandId_userId: { bandId, userId } },
    data: { role },
  });
  return NextResponse.json({ ok: true });
}

// Remove a member, or leave the band (userId === self).
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: bandId, userId } = await params;
  const myRole = bandRole(session, bandId);
  const isSelf = userId === session.user.id;

  if (!isSelf && myRole !== "OWNER") {
    return NextResponse.json(
      { error: "Only an owner can remove members" },
      { status: 403 }
    );
  }

  const target = await prisma.bandMembership.findUnique({
    where: { bandId_userId: { bandId, userId } },
  });
  if (!target) return NextResponse.json({ error: "Not a member" }, { status: 404 });

  if (target.role === "OWNER" && (await ownerCount(bandId)) <= 1) {
    return NextResponse.json(
      { error: "Transfer ownership before leaving — a band needs an owner" },
      { status: 400 }
    );
  }

  await prisma.bandMembership.delete({
    where: { bandId_userId: { bandId, userId } },
  });
  return NextResponse.json({ ok: true });
}
