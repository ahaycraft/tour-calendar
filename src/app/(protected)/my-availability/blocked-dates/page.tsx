import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireActiveBandId } from "@/lib/band";
import { needsResponseCount as getNeedsResponseCount } from "@/lib/events";
import MyAvailabilityTabs from "@/components/MyAvailabilityTabs";
import BlockedDates from "@/components/BlockedDates";

export default async function BlockedDatesPage() {
  const session = await auth();
  const bandId = await requireActiveBandId(session!);

  // Unavailability is global to the user — the same across every band.
  const [unavailableDates, needsResponseCount] = await Promise.all([
    prisma.memberUnavailability.findMany({
      where: { userId: session!.user.id },
      orderBy: { date: "asc" }
    }),
    getNeedsResponseCount(bandId, session!.user.id)
  ]);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-zinc-50 mb-2">My Availability</h1>
      <p className="text-zinc-500 text-sm mb-6">
        Manage days you can&apos;t play and your response to upcoming shows.
      </p>

      <MyAvailabilityTabs
        active="/my-availability/blocked-dates"
        needsResponseCount={needsResponseCount}
      />

      <BlockedDates
        initialUnavailableDates={unavailableDates.map((u) => ({
          id: u.id,
          date: u.date.toISOString(),
          note: u.note ?? undefined
        }))}
      />
    </div>
  );
}
