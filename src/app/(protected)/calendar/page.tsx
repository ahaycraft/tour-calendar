import { auth } from "@/auth";
import CalendarView from "@/components/CalendarView";

export default async function CalendarPage() {
  const session = await auth();
  return <CalendarView userId={session!.user.id} />;
}
