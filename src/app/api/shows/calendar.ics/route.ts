import { NextRequest, NextResponse } from "next/server";
import { startOfDay } from "date-fns";
import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getActiveBandId } from "@/lib/band";
import {
  buildCalendar,
  calendarEventSelect,
  icsFilename,
  resolveAppUrl,
} from "@/lib/calendar";
import { isEventType, eventBasePath } from "@/lib/events";

const MAX_EVENTS = 100;

/**
 * Multi-event calendar export for the active band. One of:
 *   ?ids=a,b,c            explicit selection (cancelled events kept, prefixed)
 *   ?releaseId=xxx        every session tracking a release
 *   ?scope=upcoming       everything today or later
 * plus optional &type=SHOW|RECORDING|PRACTICE. Always scoped to the caller's
 * active band, so guessed ids from another band return nothing.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bandId = await getActiveBandId(session);
  if (!bandId) {
    return NextResponse.json({ error: "No band selected" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get("ids");
  const releaseId = searchParams.get("releaseId");
  const scope = searchParams.get("scope");
  const type = searchParams.get("type");

  const where: Prisma.ShowWhereInput = { bandId };
  if (isEventType(type)) where.type = type;

  let name = "woodshedd-events";

  if (idsParam) {
    const ids = idsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, MAX_EVENTS);
    if (ids.length === 0) {
      return NextResponse.json({ error: "No events specified" }, { status: 400 });
    }
    where.id = { in: ids };
  } else if (releaseId) {
    where.releaseId = releaseId;
    where.status = { not: "CANCELLED" };
    name = "woodshedd-sessions";
  } else if (scope === "upcoming") {
    where.date = { gte: startOfDay(new Date()) };
    where.status = { not: "CANCELLED" };
    name = isEventType(type)
      ? `woodshedd-upcoming-${eventBasePath(type).slice(1)}`
      : "woodshedd-upcoming";
  } else {
    return NextResponse.json(
      { error: "Specify ids, releaseId, or scope=upcoming" },
      { status: 400 }
    );
  }

  const shows = await prisma.show.findMany({
    where,
    orderBy: { date: "asc" },
    take: MAX_EVENTS,
    select: { ...calendarEventSelect },
  });

  if (shows.length === 0) {
    return NextResponse.json({ error: "No matching events" }, { status: 404 });
  }

  const ics = buildCalendar(shows, resolveAppUrl(request));

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${icsFilename(name)}"`,
      "Cache-Control": "private, no-cache",
    },
  });
}
