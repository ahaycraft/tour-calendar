import Link from "next/link";
import { format } from "date-fns";
import ShowStatusBadge from "./ShowStatusBadge";
import AvailabilityBadge from "./AvailabilityBadge";
import { eventHref, isUpcomingEvent } from "@/lib/events";
import NeedsDetailsBadge, { needsDetails, locationLine } from "./NeedsDetailsBadge";

interface EventListItem {
  id: string;
  type: string;
  title: string;
  venue: string | null;
  city: string | null;
  state: string | null;
  date: Date | string;
  status: string;
  availability: { userId: string; status: string }[];
}

interface Props {
  events: EventListItem[];
  userId: string;
  emptyText?: string;
}

function DateBlock({ date, dim }: { date: Date | string; dim?: boolean }) {
  const d = new Date(date);
  return (
    <div
      className={`flex flex-col items-center justify-center shrink-0 w-14 rounded-lg border border-zinc-800 bg-zinc-800/70 py-2 leading-none ${
        dim ? "text-zinc-500" : ""
      }`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {format(d, "MMM")}
      </span>
      <span
        className={`my-0.5 text-xl font-bold ${dim ? "text-zinc-400" : "text-zinc-100"}`}
      >
        {format(d, "d")}
      </span>
      <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        {format(d, "EEE")}
      </span>
    </div>
  );
}

export default function EventList({ events, userId, emptyText = "Nothing here yet." }: Props) {
  // Compare by calendar day, not instant, so an event happening today counts
  // as upcoming for the whole day.
  const upcoming = events.filter(isUpcomingEvent);
  const past = events.filter((e) => !isUpcomingEvent(e));

  return (
    <>
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-zinc-400 mb-3">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="text-zinc-500 text-sm">{emptyText}</p>
        ) : (
          <div className="space-y-3">
            {upcoming.map((event) => {
              const myAvail = event.availability.find((a) => a.userId === userId);
              const availCount = event.availability.filter(
                (a) => a.status === "AVAILABLE"
              ).length;

              return (
                <Link
                  key={event.id}
                  href={eventHref(event.type, event.id)}
                  className="block bg-zinc-900 rounded-xl border border-zinc-800 p-4 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <DateBlock date={event.date} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-zinc-100">{event.title}</span>
                        <ShowStatusBadge status={event.status} />
                        {needsDetails(event) && <NeedsDetailsBadge />}
                      </div>
                      <p className="text-sm text-zinc-400 mt-0.5">{locationLine(event)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <AvailabilityBadge status={myAvail?.status ?? "PENDING"} />
                      <span className="text-xs text-zinc-500">{availCount} available</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-zinc-600 mb-3">Past / Cancelled</h2>
          <div className="space-y-3">
            {past.map((event) => (
              <Link
                key={event.id}
                href={eventHref(event.type, event.id)}
                className="block bg-zinc-900 rounded-xl border border-zinc-800 p-4 opacity-60 hover:opacity-100 hover:border-zinc-700 transition-all"
              >
                <div className="flex items-start gap-4">
                  <DateBlock date={event.date} dim />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-300">{event.title}</span>
                      <ShowStatusBadge status={event.status} />
                    </div>
                    <p className="text-sm text-zinc-500 mt-0.5">{locationLine(event)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
