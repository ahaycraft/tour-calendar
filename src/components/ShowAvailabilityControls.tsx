"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { revalidateShell } from "@/app/(protected)/actions";
import { cn } from "@/lib/utils";
import AvailabilityBadge from "@/components/AvailabilityBadge";

interface Props {
  showId: string;
  currentStatus: string;
  currentNote: string;
}

export default function ShowAvailabilityControls({
  showId,
  currentStatus,
  currentNote
}: Props) {
  const router = useRouter();
  const [note, setNote] = useState(currentNote);
  const [loading, setLoading] = useState(false);
  // Answered responses collapse to a compact summary (mirrors iOS Calendar's
  // own "you've responded" row for event invites) instead of always showing
  // the full note field + buttons. Collapses optimistically the moment a
  // status is picked, rather than waiting on the server round-trip below —
  // waiting would make the collapse feel laggy.
  const [editing, setEditing] = useState(currentStatus === "PENDING");

  async function setStatus(status: string) {
    setEditing(status === "PENDING");
    setLoading(true);
    await fetch(`/api/shows/${showId}/availability`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, note })
    });
    await revalidateShell();
    setLoading(false);
    router.refresh();
  }

  // Both regions use the same CSS-grid 0fr/1fr trick to animate to/from their
  // natural content height (a plain height transition can't target `auto`),
  // so the summary shrinks away as the form grows in and vice versa.
  const collapsible =
    "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none";

  return (
    <div>
      <div
        className={cn(
          collapsible,
          !editing ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="flex items-center gap-3 pb-3">
            <AvailabilityBadge status={currentStatus} />
            {currentNote && (
              <p className="min-w-0 flex-1 truncate text-sm text-zinc-500">
                {currentNote}
              </p>
            )}
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="ml-auto shrink-0 text-sm font-medium text-blue-400 transition-colors hover:text-blue-300"
            >
              Change response
            </button>
          </div>
        </div>
      </div>

      <div
        className={cn(
          collapsible,
          editing ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
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
        </div>
      </div>
    </div>
  );
}
