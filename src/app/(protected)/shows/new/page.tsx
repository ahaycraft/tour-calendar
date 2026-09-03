import EventForm from "@/components/EventForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getActiveBandId } from "@/lib/band";

export default async function NewShowPage() {
  const session = await auth();
  const bandId = await getActiveBandId(session!);
  const releases = bandId
    ? await prisma.release.findMany({
        where: { bandId },
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true },
      })
    : [];

  return (
    <div className="max-w-xl">
      <Link
        href="/shows"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-200 mb-6 transition-colors"
      >
        <ChevronLeft size={16} />
        Back to Shows
      </Link>

      <h1 className="text-2xl font-bold text-zinc-50 mb-6">Add Show</h1>

      <p className="text-sm text-zinc-500 -mt-4 mb-6">
        Booking a whole tour?{" "}
        <Link href="/shows/bulk" className="text-blue-400 hover:text-blue-300">
          Add a date range instead →
        </Link>
      </p>

      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
        <EventForm releases={releases} />
      </div>
    </div>
  );
}
