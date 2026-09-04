import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ChevronLeft } from "lucide-react";
import EventForm, { type EventFormValues } from "@/components/EventForm";
import {
  eventHref,
  eventTypeLabel,
  tourEditHref,
  type EventTypeStr,
} from "@/lib/events";
import { canManage, isBandMember } from "@/lib/band";

const BLOCK_NOUN: Record<EventTypeStr, string> = {
  SHOW: "tour",
  RECORDING: "recording block",
  PRACTICE: "practice block",
};

interface Props {
  id: string;
  expected: EventTypeStr;
}

export default async function EventEdit({ id, expected }: Props) {
  const session = await auth();

  const show = await prisma.show.findUnique({ where: { id } });
  if (!show || !isBandMember(session!, show.bandId)) notFound();
  if (show.type !== expected) redirect(`${eventHref(show.type, show.id)}/edit`);

  if (!canManage(session!, show.bandId, show.createdById)) {
    redirect(eventHref(show.type, show.id));
  }

  const releases = await prisma.release.findMany({
    where: { bandId: show.bandId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true },
  });

  const values: EventFormValues = {
    id: show.id,
    type: show.type,
    title: show.title,
    venue: show.venue ?? "",
    city: show.city ?? "",
    state: show.state ?? "",
    country: show.country,
    date: format(show.date, "yyyy-MM-dd"),
    loadInTime: show.loadInTime ? format(show.loadInTime, "HH:mm") : "",
    doorsTime: show.doorsTime ? format(show.doorsTime, "HH:mm") : "",
    setTime: show.setTime ? format(show.setTime, "HH:mm") : "",
    guarantee: show.guarantee != null ? String(show.guarantee) : "",
    notes: show.notes ?? "",
    venueAddress: show.venueAddress ?? "",
    venueLat: show.venueLat,
    venueLng: show.venueLng,
    releaseId: show.releaseId ?? "",
  };

  const heading =
    show.type === "RECORDING" ? "Recording Session" : eventTypeLabel(show.type);

  return (
    <div className="max-w-xl">
      <Link
        href={eventHref(show.type, show.id)}
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-200 mb-6 transition-colors"
      >
        <ChevronLeft size={16} />
        Back to {show.title}
      </Link>

      <h1 className="text-2xl font-bold text-zinc-50 mb-6">Edit {heading}</h1>

      {show.tourGroupId && (
        <div className="mb-4 rounded-lg bg-zinc-800/50 border border-zinc-800 px-4 py-3 text-sm text-zinc-400">
          One day of the{" "}
          <span className="font-medium text-zinc-200">
            {show.tourName ?? "tour"}
          </span>{" "}
          {BLOCK_NOUN[show.type]}.{" "}
          <Link
            href={tourEditHref(show.type, show.tourGroupId)}
            className="font-medium text-blue-400 hover:text-blue-300"
          >
            Edit every day at once →
          </Link>
        </div>
      )}

      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
        <EventForm event={values} releases={releases} />
      </div>
    </div>
  );
}
