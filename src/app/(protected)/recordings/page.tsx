import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireActiveBandId } from "@/lib/band";
import Link from "next/link";
import EventList from "@/components/EventList";

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-50">Recordings</h1>
        <Link
          href="/recordings/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-colors text-sm"
        >
          + Add Recording
        </Link>
      </div>

      <EventList
        events={recordings}
        userId={session!.user.id}
        emptyText="No upcoming recording sessions."
      />
    </div>
  );
}
