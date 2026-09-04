"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { eventBasePath, type EventTypeStr } from "@/lib/events";
import { revalidateShell } from "@/app/(protected)/actions";

const BLOCK_NOUN: Record<EventTypeStr, string> = {
  SHOW: "Tour",
  RECORDING: "Recording block",
  PRACTICE: "Practice block",
};

const inputClass =
  "w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

const STATUSES = [
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

export interface TourBlockValues {
  tourGroupId: string;
  type: EventTypeStr;
  name: string;
  city: string;
  state: string;
  country: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  notes: string;
  dayCount: number;
}

export default function TourBlockForm({ initial }: { initial: TourBlockValues }) {
  const router = useRouter();
  const blockNoun = BLOCK_NOUN[initial.type];

  const [name, setName] = useState(initial.name);
  const [city, setCity] = useState(initial.city);
  const [stateField, setStateField] = useState(initial.state);
  const [country, setCountry] = useState(initial.country);
  const [status, setStatus] = useState(initial.status);
  const [notes, setNotes] = useState(initial.notes);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("A name is required.");
      return;
    }
    setLoading(true);

    const res = await fetch("/api/shows/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tourGroupId: initial.tourGroupId,
        name: name.trim(),
        city,
        state: stateField,
        country,
        status,
        notes,
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLoading(false);
      setError(json.error || "Failed to save changes");
      return;
    }

    await revalidateShell();
    router.push(eventBasePath(initial.type));
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">
          {blockNoun} name{" "}
          <span className="text-red-500">*</span>
        </label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-zinc-600">
          Renaming re-titles all {initial.dayCount} day
          {initial.dayCount === 1 ? "" : "s"} &mdash; &ldquo;{name.trim() || "Tour"} &mdash;
          Day 1&rdquo;, &ldquo;Day 2&rdquo;, and so on.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            City <span className="text-zinc-600">(optional)</span>
          </label>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={inputClass}
            placeholder="Same for every date"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">State</label>
          <input
            value={stateField}
            onChange={(e) => setStateField(e.target.value)}
            className={inputClass}
            placeholder="CA"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">Country</label>
        <input
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">Status</label>
        <div className="flex gap-1 p-1 bg-zinc-800/60 rounded-lg">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setStatus(s.value)}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
                status === s.value
                  ? "bg-zinc-700 text-zinc-50"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-zinc-600">
          Applies to every day in the block.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">
          Notes <span className="text-zinc-600">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className={inputClass}
          placeholder="Shared across every day"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Saving..." : `Save changes to all ${initial.dayCount} days`}
      </button>
    </form>
  );
}
