"use client";

import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useRouter } from "next/navigation";
import type { EventInput } from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";

interface Show {
  id: string;
  title: string;
  venue: string;
  city: string;
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

export default function CalendarView({ userId }: { userId: string }) {
  const router = useRouter();
  const [shows, setShows] = useState<Show[]>([]);
  const [unavailableDates, setUnavailableDates] = useState<UnavailableDate[]>([]);
  const [loading, setLoading] = useState(true);

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

    return {
      id: show.id,
      title: `${show.title} — ${show.venue}, ${show.city}`,
      date: show.date.split("T")[0],
      backgroundColor: statusColors[show.status],
      borderColor: statusColors[show.status],
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

  async function handleDateClick(arg: DateClickArg) {
    const clickedDate = arg.dateStr;
    const isUnavailable = unavailableDates.some(
      (u) => u.date.split("T")[0] === clickedDate
    );

    if (isUnavailable) {
      if (!confirm(`Remove unavailability for ${clickedDate}?`)) return;
      const res = await fetch("/api/unavailability", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: clickedDate }),
      });
      if (res.ok) {
        setUnavailableDates((prev) =>
          prev.filter((u) => u.date.split("T")[0] !== clickedDate)
        );
      }
    } else {
      const note = prompt(`Mark ${clickedDate} as unavailable? Add a note (optional):`);
      if (note === null) return; // cancelled

      const res = await fetch("/api/unavailability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: clickedDate, note }),
      });
      if (res.ok) {
        const newRecord = await res.json();
        setUnavailableDates((prev) => [...prev, newRecord]);
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        Loading calendar...
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Calendar</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Click a date to toggle your unavailability. Click a show to view details.
          </p>
        </div>
        <button
          onClick={() => router.push("/shows/new")}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-colors text-sm"
        >
          + Add Show
        </button>
      </div>

      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
        <div className="flex gap-4 mb-4 text-xs text-zinc-500 flex-wrap">
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
            <span className="inline-block w-3 h-3 rounded-full bg-orange-500" /> You&apos;re unavailable
          </span>
        </div>

        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={[...showEvents, ...unavailableEvents]}
          dateClick={handleDateClick}
          eventClick={(info) => {
            const { type, show } = info.event.extendedProps;
            if (type === "show") {
              router.push(`/shows/${show.id}`);
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
  );
}
