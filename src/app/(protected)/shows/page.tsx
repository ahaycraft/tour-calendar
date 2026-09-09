import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireActiveBandId, withDeletePermission } from "@/lib/band";
import EventList from "@/components/EventList";
import CalendarExportLink from "@/components/CalendarExportLink";
import EventTypeTabs from "@/components/EventTypeTabs";
import AddButton from "@/components/AddButton";
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
        include: { user: { select: { id: true, name: true } } }
      }
    }
  });

  const hasUpcoming = shows.some(isUpcomingEvent);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-zinc-50">Shows</h1>
        <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
          {hasUpcoming && (
            <CalendarExportLink href="/api/shows/calendar.ics?scope=upcoming&type=SHOW" />
          )}
          <AddButton href="/shows/new" label="Add Show" />
        </div>
      </div>

      <EventTypeTabs active="/shows" />

      <EventList
        events={withDeletePermission(shows, session!, bandId)}
        userId={session!.user.id}
        emptyText="No upcoming shows. Add one!"
      />
    </div>
  );
}
