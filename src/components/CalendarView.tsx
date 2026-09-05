"use client";

import { useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useRouter } from "next/navigation";
import type { EventInput, DatesSetArg } from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";
import DayActionModal from "./DayActionModal";
import { eventHref, type EventTypeStr } from "@/lib/events";

interface Show {
  id: string;
  type: EventTypeStr;
  title: string;
  venue: string | null;
  city: string | null;
  state?: string;
  date: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  availability: Array<{
    userId: string;
    status: string;
    user: { name: string };
  }>;
}

interface UnavailableDate {
  id: string;
  date: string;
  note?: string;
  userId: string;
  user: { name: string };
}

// Muted, coordinated palette so the month view reads calm rather than neon.
// Every fill is dark enough for white event text (all ≥ 4.5:1). Hue still
// carries meaning: cool blue = pending show, green = confirmed, clay =
// cancelled, plum = recording, teal = practice, ochre = member unavailable.
const statusColors: Record<string, string> = {
  CONFIRMED: "#4d7c63", // muted moss
  PENDING: "#5b6f99", // dusty denim
  CANCELLED: "#a05a52", // faded brick
};

// Recording sessions render plum, except cancelled ones share the brick tone.
const recordingColors: Record<string, string> = {
  CONFIRMED: "#63548a", // deep plum
  PENDING: "#836c92", // dusty mauve
  CANCELLED: "#a05a52",
};

// Practices render teal, again with the shared brick tone when cancelled.
const practiceColors: Record<string, string> = {
  CONFIRMED: "#2f7d76", // deep teal
  PENDING: "#4f8a84", // dusty teal
  CANCELLED: "#a05a52",
};

function paletteFor(type: string): Record<string, string> {
  if (type === "RECORDING") return recordingColors;
  if (type === "PRACTICE") return practiceColors;
  return statusColors;
}

// Member-unavailable marker (dot + note text, and the day-cell stripe defined
// in globals.css — keep the two in sync).
const UNAVAILABLE_COLOR = "#c2894a"; // warm ochre

const legend = [
  { label: "Pending", color: statusColors.PENDING },
  { label: "Confirmed", color: statusColors.CONFIRMED },
  { label: "Cancelled", color: statusColors.CANCELLED },
  { label: "Recording session", color: recordingColors.PENDING },
  { label: "Practice", color: practiceColors.PENDING },
  { label: "Member unavailable", color: UNAVAILABLE_COLOR },
];

// Merge freshly-fetched rows into existing state by id, so re-fetching an
// overlapping range (e.g. the shared padding days between two adjacent
// months) de-dupes instead of appending duplicates.
function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const byId = new Map(existing.map((item) => [item.id, item]));
  for (const item of incoming) byId.set(item.id, item);
  return [...byId.values()];
}

export default function CalendarView({ userId }: { userId: string }) {
  const router = useRouter();
  const [shows, setShows] = useState<Show[]>([]);
  const [unavailableDates, setUnavailableDates] = useState<UnavailableDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalDate, setModalDate] = useState<string | null>(null);
  // Date ranges already fetched (`${from}_${to}` on the calendar's own visible
  // range, e.g. from `datesSet`), so paging back to a month already seen
  // doesn't re-fetch it. A ref, not state — it's read/written synchronously
  // and shouldn't trigger a render on its own.
  const loadedRanges = useRef(new Set<string>());

  // FullCalendar's day-cell dates are UTC-based (see fmtCellDate below), so
  // the visible range's start/end read the same way.
  async function loadRange(start: Date, end: Date) {
    const from = start.toISOString().slice(0, 10);
    const to = end.toISOString().slice(0, 10);
    const key = `${from}_${to}`;
    if (loadedRanges.current.has(key)) return;
    loadedRanges.current.add(key);

    const [showsRes, unavailRes] = await Promise.all([
      fetch(`/api/shows?from=${from}&to=${to}`),
      fetch(`/api/unavailability?from=${from}&to=${to}`),
    ]);
    if (showsRes.ok) {
      const fetched: Show[] = await showsRes.json();
      setShows((prev) => mergeById(prev, fetched));
    }
    if (unavailRes.ok) {
      const fetched: UnavailableDate[] = await unavailRes.json();
      setUnavailableDates((prev) => mergeById(prev, fetched));
    }
    setLoading(false);
  }

  // Fires on initial render and on every prev/next/today/view change, with
  // the grid's full visible range (including the adjacent-month padding
  // days), so this is the only load path — no separate mount-time fetch.
  function handleDatesSet(arg: DatesSetArg) {
    loadRange(arg.start, arg.end);
  }

  const showEvents: EventInput[] = shows.map((show) => {
    const myAvailability = show.availability.find((a) => a.userId === userId);
    const availableCount = show.availability.filter((a) => a.status === "AVAILABLE").length;
    const palette = paletteFor(show.type);

    return {
      id: show.id,
      title: [show.title, [show.venue, show.city].filter(Boolean).join(", ")]
        .filter(Boolean)
        .join(" — "),
      date: show.date.split("T")[0],
      backgroundColor: palette[show.status],
      borderColor: palette[show.status],
      extendedProps: { type: "show", show, myAvailability, availableCount },
    };
  });

  // Unavailable days are drawn as a striped day-cell background (see
  // dayCellClassNames + globals.css), not a pill. Each record also gets a
  // lightweight dot+text annotation naming who is out (and any note).
  const unavailableEvents: EventInput[] = unavailableDates.map((u) => {
    const who = u.userId === userId ? "You" : u.user.name.split(" ")[0];
    return {
      id: `unavail-${u.id}`,
      title: u.note ? `${who} — ${u.note}` : `${who} unavailable`,
      date: u.date.split("T")[0],
      display: "list-item",
      color: UNAVAILABLE_COLOR,
      classNames: ["fc-unavailable-note"],
      extendedProps: { type: "unavailable" },
    };
  });

  // FullCalendar day-cell markers are UTC-based (midnight UTC on the cell's
  // date), so read the date off the UTC fields, not the local ones.
  const fmtCellDate = (d: Date) => d.toISOString().slice(0, 10);
  const unavailableDateSet = new Set(
    unavailableDates.map((u) => u.date.split("T")[0])
  );

  function handleDateClick(arg: DateClickArg) {
    setModalDate(arg.dateStr);
  }

  // Swipe left / right to page the calendar (mobile — the prev/next buttons
  // are hidden there).
  const calRef = useRef<FullCalendar>(null);
  const swipeStart = useRef<{ x: number; y: number; t: number } | null>(null);

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    swipeStart.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  }

  function onTouchEnd(e: React.TouchEvent) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Date.now() - start.t > 600) return;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const api = calRef.current?.getApi();
    if (!api) return;
    if (dx < 0) api.next();
    else api.prev();
  }

  // The block/unblock control acts on the current user, so the modal only cares
  // about *their* record; the full roster for the day is passed separately.
  const modalUnavailability =
    modalDate != null
      ? unavailableDates.find(
          (u) => u.date.split("T")[0] === modalDate && u.userId === userId
        ) ?? null
      : null;
  const modalDayRoster =
    modalDate != null
      ? unavailableDates
          .filter((u) => u.date.split("T")[0] === modalDate)
          .map((u) => ({
            name: u.userId === userId ? "You" : u.user.name,
            note: u.note,
            isSelf: u.userId === userId,
          }))
      : [];

  return (
    <div>
      <div className="hidden sm:flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">
            Calendar
            {loading && (
              <span className="ml-2 text-sm font-normal text-zinc-500">Loading…</span>
            )}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Click a date to add an event or block it. Click an event to view
            details.
          </p>
        </div>
        <button
          onClick={() => router.push("/shows/new")}
          className="shrink-0 self-start whitespace-nowrap px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-colors text-sm"
        >
          + Add Event
        </button>
      </div>

      <div className="bg-zinc-900 border-y border-zinc-800 py-4 px-0 -mx-4 sm:mx-0 sm:rounded-2xl sm:border-x sm:p-4">
        <div className="flex gap-x-4 gap-y-1.5 mb-4 px-4 sm:px-0 text-xs text-zinc-500 flex-wrap">
          {legend.map(({ label, color }) => (
            <span key={label} className="flex items-center gap-1.5">
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              {label}
            </span>
          ))}
        </div>

        <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <FullCalendar
            ref={calRef}
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            events={[...showEvents, ...unavailableEvents]}
            dayCellClassNames={(arg) =>
              unavailableDateSet.has(fmtCellDate(arg.date))
                ? "fc-day-unavailable"
                : ""
            }
            datesSet={handleDatesSet}
            dateClick={handleDateClick}
            eventClick={(info) => {
              const { type, show } = info.event.extendedProps;
              if (type === "show") {
                router.push(eventHref(show.type, show.id));
              } else if (type === "unavailable" && info.event.startStr) {
                setModalDate(info.event.startStr.slice(0, 10));
              }
            }}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,dayGridWeek",
            }}
            height="auto"
            eventTimeFormat={{ hour: "numeric", meridiem: "short" }}
          />
        </div>
      </div>

      {modalDate && (
        <DayActionModal
          date={modalDate}
          existingUnavailability={modalUnavailability}
          dayRoster={modalDayRoster}
          onClose={() => setModalDate(null)}
          onUnavailabilityAdded={(record) =>
            setUnavailableDates((prev) => [...prev, record])
          }
          onUnavailabilityRemoved={(date) =>
            setUnavailableDates((prev) =>
              prev.filter(
                (u) => !(u.date.split("T")[0] === date && u.userId === userId)
              )
            )
          }
          onShowAdded={(show) => setShows((prev) => [...prev, show])}
        />
      )}
    </div>
  );
}
