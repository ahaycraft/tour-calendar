"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddShowForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));

    // Build datetime strings from date + time inputs
    const date = data.date as string;
    const loadInTime = data.loadInTime ? `${date}T${data.loadInTime}:00` : undefined;
    const doorsTime = data.doorsTime ? `${date}T${data.doorsTime}:00` : undefined;
    const setTime = data.setTime ? `${date}T${data.setTime}:00` : undefined;

    const res = await fetch("/api/shows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.title,
        venue: data.venue,
        city: data.city,
        state: data.state || undefined,
        country: data.country || "US",
        date: `${date}T00:00:00`,
        loadInTime,
        doorsTime,
        setTime,
        guarantee: data.guarantee || undefined,
        notes: data.notes || undefined,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const json = await res.json();
      setError(json.error || "Failed to create show");
      return;
    }

    const show = await res.json();
    router.push(`/shows/${show.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">
          Show Title <span className="text-red-500">*</span>
        </label>
        <input
          name="title"
          required
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g. The Roxy w/ Support Act"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">
          Date <span className="text-red-500">*</span>
        </label>
        <input
          name="date"
          type="date"
          required
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">
          Venue <span className="text-red-500">*</span>
        </label>
        <input
          name="venue"
          required
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g. The Roxy"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            City <span className="text-red-500">*</span>
          </label>
          <input
            name="city"
            required
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Los Angeles"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">State</label>
          <input
            name="state"
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="CA"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">Country</label>
        <input
          name="country"
          defaultValue="US"
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Load In</label>
          <input
            name="loadInTime"
            type="time"
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Doors</label>
          <input
            name="doorsTime"
            type="time"
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">Set Time</label>
          <input
            name="setTime"
            type="time"
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">Guarantee ($)</label>
        <input
          name="guarantee"
          type="number"
          min="0"
          step="1"
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">Notes</label>
        <textarea
          name="notes"
          rows={3}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          placeholder="Parking info, contacts, etc."
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Adding show..." : "Add Show"}
      </button>
    </form>
  );
}
