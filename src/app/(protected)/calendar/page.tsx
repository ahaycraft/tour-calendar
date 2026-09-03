import { auth } from "@/auth";
import { requireActiveBandId } from "@/lib/band";
import CalendarView from "@/components/CalendarView";

export default async function CalendarPage() {
  const session = await auth();
  const bandId = await requireActiveBandId(session!);

  // Re-key on the active band so switching bands remounts the view and it
  // re-fetches (it loads its data client-side).
  return <CalendarView key={bandId} userId={session!.user.id} />;
}
