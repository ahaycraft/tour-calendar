"use client";

import { useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useRouter } from "next/navigation";
import type { EventInput, DatesSetArg } from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";
import { ChevronLeft, ChevronRight } from "lucide-react";
import DayActionModal from "./DayActionModal";
import AddButton from "./AddButton";
import { eventHref, type EventTypeStr } from "@/lib/events";
import { cn } from "@/lib/utils";

type CalendarViewType = "dayGridMonth" | "dayGridWeek";

const VIEW_OPTIONS: { value: CalendarViewType; label: string }[] = [
  { value: "dayGridMonth", label: "Month" },
  { value: "dayGridWeek", label: "Week" }
];

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
  CANCELLED: "#a05a52" // faded brick
};

// Recording sessions render plum, except cancelled ones share the brick tone.
const recordingColors: Record<string, string> = {
  CONFIRMED: "#63548a", // deep plum
  PENDING: "#836c92", // dusty mauve
  CANCELLED: "#a05a52"
};

// Practices render teal, again with the shared brick tone when cancelled.
const practiceColors: Record<string, string> = {
  CONFIRMED: "#2f7d76", // deep teal
  PENDING: "#4f8a84", // dusty teal
  CANCELLED: "#a05a52"
};

function paletteFor(type: string): Record<string, string> {
  if (type === "RECORDING") return recordingColors;
  if (type === "PRACTICE") return practiceColors;
  return statusColors;
}

// Member-unavailable marker (dot + note text, and the day-cell stripe defined
// in globals.css — keep the two in sync).
const UNAVAILABLE_COLOR = "#c2894a"; // warm ochre

// Solid fill for the mobile initials badge (see eventContent below) — a
// deeper, more saturated orange than UNAVAILABLE_COLOR so white text sits on
// it at a solid ~5:1 contrast. A flat fill + white text needs no light/dark
// theme handling: it doesn't blend with the page background either way.
const UNAVAILABLE_BADGE_BG = "#c2410c";

const legend = [
  { label: "Pending", color: statusColors.PENDING },
  { label: "Confirmed", color: statusColors.CONFIRMED },
  { label: "Cancelled", color: statusColors.CANCELLED },
  { label: "Recording session", color: recordingColors.PENDING },
  { label: "Practice", color: practiceColors.PENDING },
  { label: "Member unavailable", color: UNAVAILABLE_COLOR }
];

// "AH" from "Alex Haycraft" — for the mobile-only initials badge (see
// eventContent below), which stands in for the full "Name — reason" note
// that doesn't fit a ~50px day cell on a phone.
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

// Merge freshly-fetched rows into existing state by id, so re-fetching an
// overlapping range (e.g. the shared padding days between two adjacent
// months) de-dupes instead of appending duplicates.
function mergeById<T extends { id: string }>(
  existing: T[],
  incoming: T[]
): T[] {
  const byId = new Map(existing.map((item) => [item.id, item]));
  for (const item of incoming) byId.set(item.id, item);
  return [...byId.values()];
}

export default function CalendarView({ userId }: { userId: string }) {
  const router = useRouter();
  const [shows, setShows] = useState<Show[]>([]);
  const [unavailableDates, setUnavailableDates] = useState<UnavailableDate[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [viewTitle, setViewTitle] = useState("");
  const [viewType, setViewType] = useState<CalendarViewType>("dayGridMonth");
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
      fetch(`/api/unavailability?from=${from}&to=${to}`)
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
    setViewTitle(arg.view.title);
    setViewType(arg.view.type as CalendarViewType);
    loadRange(arg.start, arg.end);
  }

  const showEvents: EventInput[] = shows.map((show) => {
    const myAvailability = show.availability.find((a) => a.userId === userId);
    const availableCount = show.availability.filter(
      (a) => a.status === "AVAILABLE"
    ).length;
    const palette = paletteFor(show.type);

    return {
      id: show.id,
      title: [show.title, [show.venue, show.city].filter(Boolean).join(", ")]
        .filter(Boolean)
        .join(" — "),
      date: show.date.split("T")[0],
      backgroundColor: palette[show.status],
      borderColor: palette[show.status],
      extendedProps: { type: "show", show, myAvailability, availableCount }
    };
  });

  // Unavailable days are drawn as a tinted day-cell background (see
  // dayCellClassNames + globals.css), not a pill. Each record also gets an
  // annotation naming who is out: the full "Name — reason" note on desktop,
  // shrunk down to just an initials badge on mobile (see eventContent).
  const unavailableEvents: EventInput[] = unavailableDates.map((u) => {
    const who = u.userId === userId ? "You" : u.user.name.split(" ")[0];
    return {
      id: `unavail-${u.id}`,
      title: u.note ? `${who} — ${u.note}` : `${who} unavailable`,
      date: u.date.split("T")[0],
      display: "list-item",
      color: UNAVAILABLE_COLOR,
      classNames: ["fc-unavailable-note"],
      extendedProps: { type: "unavailable", initials: initialsOf(u.user.name) }
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

  // Drive FullCalendar's imperative API from our own toolbar, styled to
  // match the rest of the app instead of FullCalendar's default buttons.
  function goToday() {
    calRef.current?.getApi().today();
  }
  function goPrev() {
    calRef.current?.getApi().prev();
  }
  function goNext() {
    calRef.current?.getApi().next();
  }

  // The block/unblock control acts on the current user, so the modal only cares
  // about *their* record; the full roster for the day is passed separately.
  const modalUnavailability =
    modalDate != null
      ? (unavailableDates.find(
          (u) => u.date.split("T")[0] === modalDate && u.userId === userId
        ) ?? null)
      : null;
  const modalDayRoster =
    modalDate != null
      ? unavailableDates
          .filter((u) => u.date.split("T")[0] === modalDate)
          .map((u) => ({
            name: u.userId === userId ? "You" : u.user.name,
            note: u.note,
            isSelf: u.userId === userId
          }))
      : [];

  return (
    <div>
      <div className="hidden sm:flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">
            Calendar
            {loading && (
              <span className="ml-2 text-sm font-normal text-zinc-500">
                Loading…
              </span>
            )}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Click a date to add an event or block it. Click an event to view
            details.
          </p>
        </div>
        <AddButton href="/shows/new" label="Add Event" />
      </div>

      <div className="bg-zinc-900 border-y border-zinc-800 py-4 px-0 -mx-4 sm:mx-0 sm:rounded-2xl sm:border-x sm:p-4">
        {/* Custom toolbar (title above, controls below) instead of
            FullCalendar's own headerToolbar, so it's styled like the rest of
            the app — same segmented-control recipe as the appearance
            toggle — rather than FullCalendar's default button skin. */}
        <div className="mb-4 flex flex-col gap-3 px-4 sm:px-0">
          <h2 className="text-lg font-semibold text-zinc-100">{viewTitle}</h2>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={goToday}
                className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
              >
                Today
              </button>
              {/* Prev/next hidden on mobile — paged by swipe instead. */}
              <button
                type="button"
                onClick={goPrev}
                aria-label="Previous"
                className="hidden h-8 w-8 items-center justify-center rounded-full border border-zinc-700 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100 sm:inline-flex"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Next"
                className="hidden h-8 w-8 items-center justify-center rounded-full border border-zinc-700 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100 sm:inline-flex"
              >
                <ChevronRight size={15} />
              </button>
            </div>

            <div
              role="radiogroup"
              aria-label="Calendar view"
              className="inline-flex rounded-lg border border-zinc-700 bg-zinc-800/50 p-0.5"
            >
              {VIEW_OPTIONS.map(({ value, label }) => {
                const active = viewType === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => calRef.current?.getApi().changeView(value)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                      active
                        ? "bg-zinc-700 text-zinc-100"
                        : "text-zinc-400 hover:text-zinc-100"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Hidden on mobile — not enough header space to justify a color key
            users pick up from using the calendar anyway. Shown from sm up,
            wrapping once there's room to spare. */}
        <div className="hidden gap-2 overflow-x-auto pb-1 mb-4 px-4 sm:flex sm:px-0 sm:flex-wrap">
          {legend.map(({ label, color }) => (
            <span
              key={label}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-800/60 px-2.5 py-1 text-xs font-medium text-zinc-400"
            >
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
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
            eventContent={(arg) => {
              // Only the "unavailable" annotation gets custom content —
              // `true` tells FullCalendar to render shows/practices/
              // recordings the normal way.
              if (arg.event.extendedProps.type !== "unavailable") return true;
              const initials = arg.event.extendedProps.initials as string;
              return (
                <>
                  <span
                    title={arg.event.title}
                    className="hidden min-w-0 items-center gap-1.5 sm:flex"
                  >
                    <span className="fc-daygrid-event-dot shrink-0" />
                    <span className="fc-event-title truncate">
                      {arg.event.title}
                    </span>
                  </span>
                  <span
                    title={arg.event.title}
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold leading-none text-white sm:hidden"
                    style={{ backgroundColor: UNAVAILABLE_BADGE_BG }}
                  >
                    {initials}
                  </span>
                </>
              );
            }}
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
            headerToolbar={false}
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
