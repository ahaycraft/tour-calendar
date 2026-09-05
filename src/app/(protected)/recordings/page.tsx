import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireActiveBandId, withDeletePermission } from "@/lib/band";
import Link from "next/link";
import EventList from "@/components/EventList";
import CalendarExportLink from "@/components/CalendarExportLink";
import { isUpcomingEvent } from "@/lib/events";

export default async function RecordingsPage() {
  const session = await auth();
  const bandId = await requireActiveBandId(session!);

  const recordings = await prisma.show.findMany({
    where: { type: "RECORDING", bandId },
    orderBy: { date: "asc" },
    include: {
      createdBy: { select: { id: true, name: true } },
      availability: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });

  const hasUpcoming = recordings.some(isUpcomingEvent);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-50">Recordings</h1>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {hasUpcoming && (
            <CalendarExportLink href="/api/shows/calendar.ics?scope=upcoming&type=RECORDING" />
          )}
          <Link
            href="/recordings/new"
            className="whitespace-nowrap px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-colors text-sm"
          >
            + Add Recording
          </Link>
        </div>
      </div>

      <EventList
        events={withDeletePermission(recordings, session!, bandId)}
        userId={session!.user.id}
        emptyText="No upcoming recording sessions."
      />
    </div>
  );
}
