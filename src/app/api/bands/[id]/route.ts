import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ACTIVE_BAND_COOKIE, bandRole } from "@/lib/band";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const role = bandRole(session, id);
  if (role !== "OWNER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { name } = await request.json();
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name can't be empty" }, { status: 400 });
    }

    const band = await prisma.band.update({
      where: { id },
      data: { name: name.trim() },
      select: { id: true, name: true },
    });
    return NextResponse.json(band);
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
  if (bandRole(session, id) !== "OWNER") {
    return NextResponse.json(
      { error: "Only an owner can delete a band" },
      { status: 403 }
    );
  }

  // Cascades to memberships, invites, shows, songs, releases and everything
  // hanging off them.
  await prisma.band.delete({ where: { id } });

  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ACTIVE_BAND_COOKIE);
  return res;
}
