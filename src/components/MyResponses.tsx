"use client";

import { useRef, useState } from "react";
import { startOfDay } from "date-fns";
import SwipeableShowRow from "./SwipeableShowRow";
import SearchInput from "./SearchInput";
import Pagination from "./Pagination";
import { revalidateShell } from "@/app/(protected)/actions";
import { calendarDate } from "@/lib/utils";
import { matchesQuery } from "@/lib/search";
import { usePagination } from "@/lib/pagination";

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

interface UndoState {
  showId: string;
  prevStatus: string;
  label: string;
}

export default function MyResponses({
  upcomingShows
}: {
  upcomingShows: UpcomingShow[];
}) {
  const [shows, setShows] = useState(upcomingShows);
  const [showQuery, setShowQuery] = useState("");
  const [undo, setUndo] = useState<UndoState | null>(null);
  const undoTimer = useRef<number | null>(null);

  async function persistStatus(
    showId: string,
    status: string
  ): Promise<boolean> {
    const res = await fetch(`/api/shows/${showId}/availability`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
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
      label: status === "AVAILABLE" ? "Marked available" : "Marked unavailable"
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

  const today = startOfDay(new Date());
  const upcomingFiltered = shows
    .filter((s) => startOfDay(calendarDate(s.date)) >= today)
    .filter((s) =>
      matchesQuery(showQuery, [s.title, s.venue, s.city, s.state])
    );
  const upcomingPage = usePagination(upcomingFiltered, undefined, showQuery);

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
      <h2 className="font-semibold text-zinc-100 mb-1">
        Upcoming Shows — My Responses
      </h2>
      <p className="text-xs text-zinc-500 mb-4">
        Slide a show right if you&apos;re available, left if you&apos;re not.
        Tap to open it.
      </p>

      {shows.length > 0 && (
        <SearchInput
          value={showQuery}
          onChange={setShowQuery}
          placeholder="Search by title, venue, or city"
          className="mb-4"
        />
      )}

      {upcomingFiltered.length === 0 ? (
        <p className="text-sm text-zinc-500">
          {showQuery ? "No matches." : "No upcoming shows yet."}
        </p>
      ) : (
        <>
          <ul className="space-y-3">
            {upcomingPage.pageItems.map((show) => (
              <SwipeableShowRow
                key={`${show.id}:${show.myStatus}`}
                show={show}
                onRespond={handleRespond}
              />
            ))}
          </ul>
          <Pagination
            page={upcomingPage.page}
            totalPages={upcomingPage.totalPages}
            onChange={upcomingPage.setPage}
          />
        </>
      )}

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
