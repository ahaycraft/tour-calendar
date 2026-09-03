"use client";

import { useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useRouter } from "next/navigation";
import type { EventInput } from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";
import DayActionModal from "./DayActionModal";
import { eventHref } from "@/lib/events";

interface Show {
  id: string;
  type: "SHOW" | "RECORDING";
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
}

const statusColors: Record<string, string> = {
  CONFIRMED: "#16a34a",
  PENDING: "#2563eb",
  CANCELLED: "#dc2626",
};

// Recording sessions render violet, except cancelled ones stay red.
const recordingColors: Record<string, string> = {
  CONFIRMED: "#7c3aed",
  PENDING: "#8b5cf6",
  CANCELLED: "#dc2626",
};

export default function CalendarView({ userId }: { userId: string }) {
  const router = useRouter();
  const [shows, setShows] = useState<Show[]>([]);
  const [unavailableDates, setUnavailableDates] = useState<UnavailableDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalDate, setModalDate] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [showsRes, unavailRes] = await Promise.all([
        fetch("/api/shows"),
        fetch("/api/unavailability"),
      ]);
      if (showsRes.ok) setShows(await showsRes.json());
      if (unavailRes.ok) setUnavailableDates(await unavailRes.json());
      setLoading(false);
    }
    load();
  }, []);

  const showEvents: EventInput[] = shows.map((show) => {
    const myAvailability = show.availability.find((a) => a.userId === userId);
    const availableCount = show.availability.filter((a) => a.status === "AVAILABLE").length;
    const palette = show.type === "RECORDING" ? recordingColors : statusColors;

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

  const unavailableEvents: EventInput[] = unavailableDates.map((u) => ({
    id: `unavail-${u.id}`,
    title: u.note ? `Unavailable: ${u.note}` : "Unavailable",
    date: u.date.split("T")[0],
    backgroundColor: "#f97316",
    borderColor: "#f97316",
    extendedProps: { type: "unavailable" },
  }));

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

  const modalUnavailability =
    modalDate != null
      ? unavailableDates.find((u) => u.date.split("T")[0] === modalDate) ?? null
      : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        Loading calendar...
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Calendar</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Click a date to add a show or block it. Click a show to view details.
          </p>
        </div>
        <button
          onClick={() => router.push("/shows/new")}
          className="shrink-0 self-start whitespace-nowrap px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-colors text-sm"
        >
          + Add Show
        </button>
      </div>

      <div className="bg-zinc-900 border-y border-zinc-800 py-4 px-0 -mx-4 sm:mx-0 sm:rounded-2xl sm:border-x sm:p-4">
        <div className="flex gap-x-4 gap-y-1.5 mb-4 px-4 sm:px-0 text-xs text-zinc-500 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-blue-500" /> Pending
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-green-500" /> Confirmed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-red-500" /> Cancelled
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-violet-500" /> Recording session
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-orange-500" /> You&apos;re unavailable
          </span>
        </div>

        <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <FullCalendar
            ref={calRef}
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            events={[...showEvents, ...unavailableEvents]}
            dateClick={handleDateClick}
            eventClick={(info) => {
              const { type, show } = info.event.extendedProps;
              if (type === "show") {
                router.push(eventHref(show.type, show.id));
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
          onClose={() => setModalDate(null)}
          onUnavailabilityAdded={(record) =>
            setUnavailableDates((prev) => [...prev, record])
          }
          onUnavailabilityRemoved={(date) =>
            setUnavailableDates((prev) =>
              prev.filter((u) => u.date.split("T")[0] !== date)
            )
          }
          onShowAdded={(show) => setShows((prev) => [...prev, show])}
        />
      )}
    </div>
  );
}
