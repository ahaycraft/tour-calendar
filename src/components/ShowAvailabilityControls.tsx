"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  showId: string;
  currentStatus: string;
  currentNote: string;
}

export default function ShowAvailabilityControls({ showId, currentStatus, currentNote }: Props) {
  const router = useRouter();
  const [note, setNote] = useState(currentNote);
  const [loading, setLoading] = useState(false);

  async function setStatus(status: string) {
    setLoading(true);
    await fetch(`/api/shows/${showId}/availability`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, note }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note (optional)"
        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <div className="flex gap-2">
        <button
          onClick={() => setStatus("AVAILABLE")}
          disabled={loading}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
            currentStatus === "AVAILABLE"
              ? "bg-green-600 text-white"
              : "border border-green-800 text-green-400 hover:bg-green-900/40"
          }`}
        >
          Available
        </button>
        <button
          onClick={() => setStatus("UNAVAILABLE")}
          disabled={loading}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
            currentStatus === "UNAVAILABLE"
              ? "bg-red-600 text-white"
              : "border border-red-800 text-red-400 hover:bg-red-900/40"
          }`}
        >
          Unavailable
        </button>
        {currentStatus !== "PENDING" && (
          <button
            onClick={() => setStatus("PENDING")}
            disabled={loading}
            className="py-2 px-3 rounded-lg text-sm font-medium border border-zinc-700 text-zinc-400 hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
