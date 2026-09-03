"use client";

import { useState } from "react";
import { format, startOfDay } from "date-fns";
import AvailabilityBadge from "./AvailabilityBadge";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { eventHref } from "@/lib/events";
import { locationLine } from "./NeedsDetailsBadge";

interface UnavailableDate {
  id: string;
  date: string;
  note?: string;
}

interface UpcomingShow {
  id: string;
  type: string;
  title: string;
  venue: string | null;
  city: string | null;
  state: string | null;
  date: string;
  myStatus: string;
}

interface Props {
  initialUnavailableDates: UnavailableDate[];
  upcomingShows: UpcomingShow[];
}

export default function MyAvailabilityManager({
  initialUnavailableDates,
  upcomingShows,
}: Props) {
  const [unavailableDates, setUnavailableDates] = useState(initialUnavailableDates);
  const [newDate, setNewDate] = useState("");
  const [newNote, setNewNote] = useState("");
  const [adding, setAdding] = useState(false);

  async function addDate(e: React.FormEvent) {
    e.preventDefault();
    if (!newDate) return;
    setAdding(true);

    const res = await fetch("/api/unavailability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: newDate, note: newNote }),
    });

    if (res.ok) {
      const record = await res.json();
      setUnavailableDates((prev) => [...prev, { ...record, date: record.date }].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ));
      setNewDate("");
      setNewNote("");
    }
    setAdding(false);
  }

  async function removeDate(id: string, date: string) {
    const res = await fetch("/api/unavailability", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date }),
    });
    if (res.ok) {
      setUnavailableDates((prev) => prev.filter((u) => u.id !== id));
    }
  }

  const today = startOfDay(new Date());
  const upcomingFiltered = upcomingShows.filter(
    (s) => startOfDay(new Date(s.date)) >= today
  );

  return (
    <div className="space-y-8">
      {/* Unavailable Dates */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
        <h2 className="font-semibold text-zinc-100 mb-4">Blocked Dates</h2>

        <form onSubmit={addDate} className="flex gap-2 mb-5 flex-wrap">
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            required
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Reason (optional)"
            className="flex-1 min-w-[140px] px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={adding}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {adding ? "Adding..." : "Block Date"}
          </button>
        </form>

        {unavailableDates.length === 0 ? (
          <p className="text-sm text-zinc-500">No blocked dates. All clear!</p>
        ) : (
          <ul className="space-y-2">
            {unavailableDates.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0"
              >
                <div>
                  <span className="text-sm font-medium text-zinc-200">
                    {format(new Date(u.date), "EEE, MMM d, yyyy")}
                  </span>
                  {u.note && (
                    <span className="text-xs text-zinc-500 ml-2">{u.note}</span>
                  )}
                </div>
                <button
                  onClick={() => removeDate(u.id, u.date)}
                  className="text-zinc-600 hover:text-red-400 transition-colors p-1"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Upcoming Shows */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
        <h2 className="font-semibold text-zinc-100 mb-4">Upcoming Shows — My Responses</h2>

        {upcomingFiltered.length === 0 ? (
          <p className="text-sm text-zinc-500">No upcoming shows yet.</p>
        ) : (
          <ul className="space-y-3">
            {upcomingFiltered.map((show) => (
              <li key={show.id}>
                <Link
                  href={eventHref(show.type, show.id)}
                  className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/60 transition-all"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{show.title}</p>
                    <p className="text-xs text-zinc-500">
                      {locationLine(show)} ·{" "}
                      {format(new Date(show.date), "MMM d, yyyy")}
                    </p>
                  </div>
                  <AvailabilityBadge status={show.myStatus} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
