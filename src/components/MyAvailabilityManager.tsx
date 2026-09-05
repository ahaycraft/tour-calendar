"use client";

import { useRef, useState } from "react";
import { format, startOfDay } from "date-fns";
import { Trash2 } from "lucide-react";
import SwipeableShowRow from "./SwipeableShowRow";
import DatePicker from "./DatePicker";
import { revalidateShell } from "@/app/(protected)/actions";
import { calendarDate } from "@/lib/utils";

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

interface UndoState {
  showId: string;
  prevStatus: string;
  label: string;
}

export default function MyAvailabilityManager({
  initialUnavailableDates,
  upcomingShows,
}: Props) {
  const [unavailableDates, setUnavailableDates] = useState(initialUnavailableDates);
  const [shows, setShows] = useState(upcomingShows);
  const [undo, setUndo] = useState<UndoState | null>(null);
  const undoTimer = useRef<number | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [newNote, setNewNote] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  async function persistStatus(showId: string, status: string): Promise<boolean> {
    const res = await fetch(`/api/shows/${showId}/availability`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    // Keep the nav's "needs response" count in sync.
    await revalidateShell();
    return res.ok;
  }

  function setStatusLocal(showId: string, status: string) {
    setShows((prev) =>
      prev.map((s) => (s.id === showId ? { ...s, myStatus: status } : s))
    );
  }

  async function handleRespond(
    showId: string,
    status: "AVAILABLE" | "UNAVAILABLE"
  ) {
    const prevStatus =
      shows.find((s) => s.id === showId)?.myStatus ?? "PENDING";
    setStatusLocal(showId, status);

    if (undoTimer.current) window.clearTimeout(undoTimer.current);
    setUndo({
      showId,
      prevStatus,
      label: status === "AVAILABLE" ? "Marked available" : "Marked unavailable",
    });
    undoTimer.current = window.setTimeout(() => setUndo(null), 6000);

    const ok = await persistStatus(showId, status);
    if (!ok) {
      setStatusLocal(showId, prevStatus);
      setUndo(null);
    }
  }

  async function handleUndo() {
    if (!undo) return;
    const { showId, prevStatus } = undo;
    if (undoTimer.current) window.clearTimeout(undoTimer.current);
    setUndo(null);
    setStatusLocal(showId, prevStatus);
    await persistStatus(showId, prevStatus);
  }

  async function addDate(e: React.FormEvent) {
    e.preventDefault();
    if (!newDate) {
      setAddError("Pick a start date");
      return;
    }
    setAdding(true);
    setAddError("");

    const res = await fetch("/api/unavailability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: newDate,
        endDate: newEndDate || undefined,
        note: newNote,
      }),
    });

    if (res.ok) {
      const records: UnavailableDate[] = await res.json();
      setUnavailableDates((prev) => {
        const byId = new Map(prev.map((u) => [u.id, u] as const));
        for (const record of records) byId.set(record.id, record);
        return Array.from(byId.values()).sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
      });
      setNewDate("");
      setNewEndDate("");
      setNewNote("");
    } else {
      const body = await res.json().catch(() => ({}));
      setAddError(body.error || "Failed to block those dates");
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
  const upcomingFiltered = shows.filter(
    (s) => startOfDay(calendarDate(s.date)) >= today
  );

  return (
    <div className="space-y-8">
      {/* Unavailable Dates */}
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
        <h2 className="font-semibold text-zinc-100 mb-4">Blocked Dates</h2>

        <form onSubmit={addDate} className="flex flex-col gap-2 mb-4 sm:flex-row sm:flex-wrap">
          <DatePicker label="Start date" value={newDate} onChange={setNewDate} />
          <DatePicker
            label="End date (optional)"
            value={newEndDate}
            onChange={setNewEndDate}
            min={newDate || undefined}
          />
          <div className="w-full sm:flex-1 sm:min-w-[140px]">
            <label className="block text-xs text-zinc-500 mb-1 sm:invisible">Reason</label>
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Reason (optional)"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="w-full sm:w-auto sm:self-end">
            <button
              type="submit"
              disabled={adding}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors sm:w-auto"
            >
              {adding ? "Adding..." : newEndDate ? "Block Dates" : "Block Date"}
            </button>
          </div>
        </form>

        {addError && <p className="text-sm text-red-400 mb-4">{addError}</p>}

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
                    {format(calendarDate(u.date), "EEE, MMM d, yyyy")}
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
        <h2 className="font-semibold text-zinc-100 mb-1">Upcoming Shows — My Responses</h2>
        <p className="text-xs text-zinc-500 mb-4">
          Slide a show right if you&apos;re available, left if you&apos;re not.
          Tap to open it.
        </p>

        {upcomingFiltered.length === 0 ? (
          <p className="text-sm text-zinc-500">No upcoming shows yet.</p>
        ) : (
          <ul className="space-y-3">
            {upcomingFiltered.map((show) => (
              <SwipeableShowRow
                key={`${show.id}:${show.myStatus}`}
                show={show}
                onRespond={handleRespond}
              />
            ))}
          </ul>
        )}
      </div>

      {undo && (
        <div
          className="fixed inset-x-0 z-50 flex justify-center px-4 pointer-events-none"
          style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}
        >
          <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-black px-4 py-2 shadow-xl">
            <span className="text-sm text-white">{undo.label}</span>
            <button
              onClick={handleUndo}
              className="text-sm font-semibold text-blue-400 hover:text-blue-300"
            >
              Undo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
