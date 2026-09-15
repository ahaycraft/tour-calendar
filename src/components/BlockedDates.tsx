"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import DateRangePicker from "./DateRangePicker";
import SearchInput from "./SearchInput";
import Pagination from "./Pagination";
import { calendarDate } from "@/lib/utils";
import { matchesQuery } from "@/lib/search";
import { usePagination } from "@/lib/pagination";
import { invalidateCalendarCache } from "@/lib/calendarCache";

interface UnavailableDate {
  id: string;
  date: string;
  note?: string;
}

export default function BlockedDates({
  initialUnavailableDates
}: {
  initialUnavailableDates: UnavailableDate[];
}) {
  const [unavailableDates, setUnavailableDates] = useState(
    initialUnavailableDates
  );
  const [dateQuery, setDateQuery] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [newNote, setNewNote] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

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
        note: newNote
      })
    });

    if (res.ok) {
      invalidateCalendarCache();
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
      body: JSON.stringify({ date })
    });
    if (res.ok) {
      invalidateCalendarCache();
      setUnavailableDates((prev) => prev.filter((u) => u.id !== id));
    }
  }

  const blockedFiltered = unavailableDates.filter((u) =>
    matchesQuery(dateQuery, [
      format(calendarDate(u.date), "EEE, MMM d, yyyy"),
      u.note
    ])
  );
  const blockedPage = usePagination(blockedFiltered, undefined, dateQuery);

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
      <h2 className="font-semibold text-zinc-100 mb-4">Blocked Dates</h2>

      <form
        onSubmit={addDate}
        className="flex flex-col gap-2 mb-4 sm:flex-row sm:flex-wrap"
      >
        <DateRangePicker
          label="Date(s)"
          value={{ start: newDate, end: newEndDate }}
          onChange={({ start, end }) => {
            setNewDate(start);
            setNewEndDate(end);
          }}
          required
        />
        <div className="w-full sm:flex-1 sm:min-w-[140px]">
          <label className="block text-xs text-zinc-500 mb-1 sm:invisible">
            Reason
          </label>
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

      {unavailableDates.length > 0 && (
        <SearchInput
          value={dateQuery}
          onChange={setDateQuery}
          placeholder="Search by date or reason"
          className="mb-4"
        />
      )}

      {blockedFiltered.length === 0 ? (
        <p className="text-sm text-zinc-500">
          {dateQuery ? "No matches." : "No blocked dates. All clear!"}
        </p>
      ) : (
        <>
          <ul className="space-y-2">
            {blockedPage.pageItems.map((u) => (
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
          <Pagination
            page={blockedPage.page}
            totalPages={blockedPage.totalPages}
            onChange={blockedPage.setPage}
          />
        </>
      )}
    </div>
  );
}
