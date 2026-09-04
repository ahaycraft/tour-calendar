import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireActiveBandId } from "@/lib/band";
import MyAvailabilityManager from "@/components/MyAvailabilityManager";
import PushToggle from "@/components/PushToggle";

export default async function MyAvailabilityPage() {
  const session = await auth();
  const bandId = await requireActiveBandId(session!);

  // Unavailability is global to the user — the same across every band.
  const unavailableDates = await prisma.memberUnavailability.findMany({
    where: { userId: session!.user.id },
    orderBy: { date: "asc" },
  });

  const allShows = await prisma.show.findMany({
    where: { bandId, status: { not: "CANCELLED" } },
    orderBy: { date: "asc" },
    include: {
      availability: {
        where: { userId: session!.user.id },
      },
    },
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-zinc-50 mb-2">My Availability</h1>
      <p className="text-zinc-500 text-sm mb-6">
        Manage days you can&apos;t play and your response to upcoming shows.
      </p>

      <div className="mb-6">
        <PushToggle />
      </div>

      <MyAvailabilityManager
        initialUnavailableDates={unavailableDates.map((u) => ({
          id: u.id,
          date: u.date.toISOString(),
          note: u.note ?? undefined,
        }))}
        upcomingShows={allShows.map((s) => ({
          id: s.id,
          type: s.type,
          title: s.title,
          venue: s.venue,
          city: s.city,
          state: s.state,
          date: s.date.toISOString(),
          myStatus: s.availability[0]?.status ?? "PENDING",
        }))}
      />
    </div>
  );
}
