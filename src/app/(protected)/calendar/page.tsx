import { auth } from "@/auth";
import { requireActiveBandId } from "@/lib/band";
import CalendarView from "@/components/CalendarView";

export default async function CalendarPage() {
  const session = await auth();
  const bandId = await requireActiveBandId(session!);

  // Re-key on the active band so switching bands remounts the view. It loads
  // its data client-side, seeded from that band's session cache when there
  // is one (see lib/calendarCache.ts) rather than always refetching.
  return (
    <CalendarView key={bandId} userId={session!.user.id} bandId={bandId} />
  );
}
