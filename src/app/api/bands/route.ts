import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ACTIVE_BAND_COOKIE, uniqueBandSlug } from "@/lib/band";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { name } = await request.json();
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "A name is required" }, { status: 400 });
    }

    const band = await prisma.band.create({
      data: {
        name: name.trim(),
        slug: await uniqueBandSlug(name),
        memberships: { create: { userId: session.user.id, role: "OWNER" } },
      },
      select: { id: true },
    });

    const res = NextResponse.json({ id: band.id }, { status: 201 });
    res.cookies.set(ACTIVE_BAND_COOKIE, band.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
