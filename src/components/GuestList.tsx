"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

const fieldClass =
  "w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none";

// Always submits a blank textarea rather than the existing list, and the
// server appends (see /api/shows/[id]/guests) — so two people adding
// guests around the same time both land instead of one clobbering the
// other's edit the way a plain "edit the whole field" form would.
export default function GuestList({
  showId,
  guestList
}: {
  showId: string;
  guestList: string | null;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [names, setNames] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!names.trim()) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/shows/${showId}/guests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ names })
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error || "Couldn't save");
      return;
    }
    setNames("");
    setAdding(false);
    router.refresh();
  }

  function cancel() {
    setAdding(false);
    setNames("");
    setError("");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-zinc-100">Guest List</h2>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-sm text-blue-400 hover:text-blue-300 font-medium"
          >
            Add guests
          </button>
        )}
      </div>

      {guestList ? (
        <p className="text-sm text-zinc-300 whitespace-pre-wrap">{guestList}</p>
      ) : (
        !adding && (
          <p className="text-sm text-zinc-500">No guests added yet.</p>
        )
      )}

      {adding && (
        <form onSubmit={save} className="mt-3 space-y-2">
          <textarea
            autoFocus
            rows={3}
            value={names}
            onChange={(e) => setNames(e.target.value)}
            placeholder={"One name per line, e.g.\nJane Smith\nJohn Doe"}
            className={fieldClass}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy || !names.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : "Add"}
            </button>
            <button
              type="button"
              onClick={cancel}
              className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
