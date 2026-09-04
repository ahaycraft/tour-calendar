import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ChevronLeft } from "lucide-react";
import TourBlockForm, { type TourBlockValues } from "@/components/TourBlockForm";
import { eventBasePath, tourEditHref } from "@/lib/events";
import { canManage, isBandMember } from "@/lib/band";

interface Props {
  tourGroupId: string;
  expected: "SHOW" | "RECORDING";
}

export default async function TourEdit({ tourGroupId, expected }: Props) {
  const session = await auth();

  const events = await prisma.show.findMany({
    where: { tourGroupId },
    orderBy: { date: "asc" },
  });

  const first = events[0];
  if (!first || !isBandMember(session!, first.bandId)) notFound();
  if (first.type !== expected) redirect(tourEditHref(first.type, tourGroupId));
  if (!canManage(session!, first.bandId, first.createdById)) {
    redirect(eventBasePath(first.type));
  }

  const isRecording = first.type === "RECORDING";
  const last = events[events.length - 1];
  const range =
    events.length === 1
      ? format(first.date, "EEE, MMM d")
      : `${format(first.date, "MMM d")} – ${format(last.date, "MMM d, yyyy")}`;

  const initial: TourBlockValues = {
    tourGroupId,
    type: first.type,
    name: first.tourName ?? first.title,
    city: first.city ?? "",
    state: first.state ?? "",
    country: first.country,
    status: first.status,
    notes: first.notes ?? "",
    dayCount: events.length,
  };

  return (
    <div className="max-w-xl">
      <Link
        href={eventBasePath(first.type)}
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-200 mb-6 transition-colors"
      >
        <ChevronLeft size={16} />
        Back to {isRecording ? "Recordings" : "Shows"}
      </Link>

      <h1 className="text-2xl font-bold text-zinc-50 mb-1">
        Edit {isRecording ? "recording block" : "tour"}
      </h1>
      <p className="text-sm text-zinc-500 mb-6">
        {events.length} day{events.length === 1 ? "" : "s"} · {range}. Changes here
        apply to every day; edit a single day from its own page.
      </p>

      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
        <TourBlockForm initial={initial} />
      </div>
    </div>
  );
}
