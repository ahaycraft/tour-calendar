"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "./ConfirmDialog";
import SwipeableEventRow, { type EventListItem } from "./SwipeableEventRow";
import SearchInput from "./SearchInput";
import Pagination from "./Pagination";
import { eventNoun, isUpcomingEvent } from "@/lib/events";
import { matchesQuery } from "@/lib/search";
import { usePagination } from "@/lib/pagination";
import { invalidateCalendarCache } from "@/lib/calendarCache";

interface Props {
  events: EventListItem[];
  userId: string;
  emptyText?: string;
}

export default function EventList({
  events: initialEvents,
  userId,
  emptyText = "Nothing here yet."
}: Props) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    title: string;
    type: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function doDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    const res = await fetch(`/api/shows/${pendingDelete.id}`, {
      method: "DELETE"
    });
    setDeleting(false);
    if (res.ok) {
      invalidateCalendarCache();
      setEvents((prev) => prev.filter((e) => e.id !== pendingDelete.id));
      setPendingDelete(null);
      router.refresh();
    }
  }

  const filtered = events.filter((e) =>
    matchesQuery(query, [e.title, e.venue, e.city, e.state])
  );

  // Compare by calendar day, not instant, so an event happening today counts
  // as upcoming for the whole day.
  const upcoming = filtered.filter(isUpcomingEvent);
  const past = filtered.filter((e) => !isUpcomingEvent(e));

  // Paginated independently since they're two separate sections — a page of
  // Upcoming shouldn't depend on how many Past events came before it.
  const upcomingPage = usePagination(upcoming, undefined, query);
  const pastPage = usePagination(past, undefined, query);

  return (
    <>
      {events.length > 0 && (
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search by title, venue, or city"
          className="mb-6"
        />
      )}

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-zinc-400 mb-3">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="text-zinc-500 text-sm">
            {query ? "No matches." : emptyText}
          </p>
        ) : (
          <>
            <div className="space-y-3">
              {upcomingPage.pageItems.map((event) => (
                <SwipeableEventRow
                  key={event.id}
                  event={event}
                  userId={userId}
                  isPast={false}
                  awaitingConfirm={pendingDelete?.id === event.id}
                  onDeleteRequest={setPendingDelete}
                />
              ))}
            </div>
            <Pagination
              page={upcomingPage.page}
              totalPages={upcomingPage.totalPages}
              onChange={upcomingPage.setPage}
            />
          </>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-zinc-600 mb-3">
            Past / Cancelled
          </h2>
          <div className="space-y-3">
            {pastPage.pageItems.map((event) => (
              <SwipeableEventRow
                key={event.id}
                event={event}
                userId={userId}
                isPast
                awaitingConfirm={pendingDelete?.id === event.id}
                onDeleteRequest={setPendingDelete}
              />
            ))}
          </div>
          <Pagination
            page={pastPage.page}
            totalPages={pastPage.totalPages}
            onChange={pastPage.setPage}
          />
        </section>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Delete this ${pendingDelete ? eventNoun(pendingDelete.type) : "event"}?`}
        message={
          <>
            {pendingDelete && (
              <>
                &ldquo;{pendingDelete.title}&rdquo; and everyone&apos;s
                availability responses for it will be removed. This can&apos;t
                be undone.
              </>
            )}
          </>
        }
        confirmLabel="Delete"
        tone="danger"
        busy={deleting}
        onConfirm={doDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
