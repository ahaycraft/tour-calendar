import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ACTIVE_BAND_COOKIE, isBandMember } from "@/lib/band";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bandId } = await request.json();
  if (!isBandMember(session, bandId)) {
    return NextResponse.json({ error: "Not a member of that band" }, { status: 403 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACTIVE_BAND_COOKIE, bandId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
