import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isBandMember } from "@/lib/band";
import { corsPreflight, withCors } from "@/lib/cors";

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}

// Appends to Show.guestList rather than replacing it — see the schema
// comment. The append itself happens in one atomic UPDATE...RETURNING so
// two members adding guests around the same time both land, instead of a
// read-then-write race where the second save silently drops the first.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withCors(request, async () => {
    const session = await auth();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: showId } = await params;

    const show = await prisma.show.findUnique({
      where: { id: showId },
      select: { bandId: true }
    });
    if (!show || !isBandMember(session, show.bandId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    try {
      const { names } = await request.json();
      if (typeof names !== "string" || !names.trim()) {
        return NextResponse.json(
          { error: "Enter at least one guest name" },
          { status: 400 }
        );
      }

      const result = await prisma.$queryRaw<{ guestList: string }[]>`
        UPDATE "Show"
        SET "guestList" = CASE
          WHEN "guestList" IS NULL OR "guestList" = '' THEN ${names.trim()}
          ELSE "guestList" || E'\n' || ${names.trim()}
        END
        WHERE id = ${showId}
        RETURNING "guestList"
      `;

      return NextResponse.json({ guestList: result[0]?.guestList ?? null });
    } catch {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}
