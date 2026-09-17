import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ACTIVE_BAND_COOKIE, bandRole, isBandMember } from "@/lib/band";
import { corsPreflight, withCors } from "@/lib/cors";

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}

// Used by the mobile app's rider editor/viewer, so a band member who isn't an
// owner/admin can still read the rider to email it to a venue.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withCors(request, async () => {
    const session = await auth();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!isBandMember(session, id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const band = await prisma.band.findUnique({
      where: { id },
      select: { id: true, name: true, rider: true }
    });
    if (!band) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(band);
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withCors(request, async () => {
    const session = await auth();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const role = bandRole(session, id);
    if (role !== "OWNER" && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
      const { name, rider } = await request.json();

      if (name !== undefined && (typeof name !== "string" || !name.trim())) {
        return NextResponse.json(
          { error: "Name can't be empty" },
          { status: 400 }
        );
      }
      if (rider !== undefined && typeof rider !== "string") {
        return NextResponse.json({ error: "Invalid rider" }, { status: 400 });
      }

      const band = await prisma.band.update({
        where: { id },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(rider !== undefined && { rider: rider.trim() || null })
        },
        select: { id: true, name: true, rider: true }
      });
      return NextResponse.json(band);
    } catch {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withCors(request, async () => {
    const session = await auth();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (bandRole(session, id) !== "OWNER") {
      return NextResponse.json(
        { error: "Only an owner can delete a group" },
        { status: 403 }
      );
    }

    // Cascades to memberships, invites, shows, songs, releases and everything
    // hanging off them.
    await prisma.band.delete({ where: { id } });

    const res = NextResponse.json({ ok: true });
    res.cookies.delete(ACTIVE_BAND_COOKIE);
    return res;
  });
}
