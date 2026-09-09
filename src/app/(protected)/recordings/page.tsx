import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireActiveBandId, withDeletePermission } from "@/lib/band";
import EventList from "@/components/EventList";
import CalendarExportLink from "@/components/CalendarExportLink";
import EventTypeTabs from "@/components/EventTypeTabs";
import AddButton from "@/components/AddButton";
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
        include: { user: { select: { id: true, name: true } } }
      }
    }
  });

  const hasUpcoming = recordings.some(isUpcomingEvent);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-zinc-50">Recordings</h1>
        <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
          {hasUpcoming && (
            <CalendarExportLink href="/api/shows/calendar.ics?scope=upcoming&type=RECORDING" />
          )}
          <AddButton href="/recordings/new" label="Add Recording" />
        </div>
      </div>

      <EventTypeTabs active="/recordings" />

      <EventList
        events={withDeletePermission(recordings, session!, bandId)}
        userId={session!.user.id}
        emptyText="No upcoming recording sessions."
      />
    </div>
  );
}
