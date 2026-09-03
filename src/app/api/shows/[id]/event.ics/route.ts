import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isBandMember } from "@/lib/band";
import {
  buildCalendar,
  calendarEventSelect,
  icsFilename,
  resolveAppUrl,
} from "@/lib/calendar";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const show = await prisma.show.findUnique({
    where: { id },
    select: { ...calendarEventSelect, bandId: true },
  });

  if (!show || !isBandMember(session, show.bandId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ics = buildCalendar([show], resolveAppUrl(request));

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${icsFilename(show.title)}"`,
      "Cache-Control": "private, no-cache",
    },
  });
}
