import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireActiveBandId, withDeletePermission } from "@/lib/band";
import EventList from "@/components/EventList";
import CalendarExportLink from "@/components/CalendarExportLink";
import EventTypeTabs from "@/components/EventTypeTabs";
import AddButton from "@/components/AddButton";
import { isUpcomingEvent } from "@/lib/events";

export default async function PracticesPage() {
  const session = await auth();
  const bandId = await requireActiveBandId(session!);

  const practices = await prisma.show.findMany({
    where: { type: "PRACTICE", bandId },
    orderBy: { date: "asc" },
    include: {
      createdBy: { select: { id: true, name: true } },
      availability: {
        include: { user: { select: { id: true, name: true } } }
      }
    }
  });

  const hasUpcoming = practices.some(isUpcomingEvent);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-zinc-50">Practices</h1>
        <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
          {hasUpcoming && (
            <CalendarExportLink href="/api/shows/calendar.ics?scope=upcoming&type=PRACTICE" />
          )}
          <AddButton href="/practices/new" label="Add Practice" />
        </div>
      </div>

      <EventTypeTabs active="/practices" />

      <EventList
        events={withDeletePermission(practices, session!, bandId)}
        userId={session!.user.id}
        emptyText="No upcoming practices."
      />
    </div>
  );
}
