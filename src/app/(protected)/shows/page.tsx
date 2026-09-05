import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireActiveBandId, withDeletePermission } from "@/lib/band";
import Link from "next/link";
import EventList from "@/components/EventList";
import CalendarExportLink from "@/components/CalendarExportLink";
import { isUpcomingEvent } from "@/lib/events";

export default async function ShowsPage() {
  const session = await auth();
  const bandId = await requireActiveBandId(session!);

  const shows = await prisma.show.findMany({
    where: { type: "SHOW", bandId },
    orderBy: { date: "asc" },
    include: {
      createdBy: { select: { id: true, name: true } },
      availability: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });

  const hasUpcoming = shows.some(isUpcomingEvent);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-50">Shows</h1>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {hasUpcoming && (
            <CalendarExportLink href="/api/shows/calendar.ics?scope=upcoming&type=SHOW" />
          )}
          <Link
            href="/shows/new"
            className="whitespace-nowrap px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-colors text-sm"
          >
            + Add Show
          </Link>
        </div>
      </div>

      <EventList
        events={withDeletePermission(shows, session!, bandId)}
        userId={session!.user.id}
        emptyText="No upcoming shows. Add one!"
      />
    </div>
  );
}
