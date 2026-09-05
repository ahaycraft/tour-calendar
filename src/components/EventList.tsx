"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "./ConfirmDialog";
import SwipeableEventRow, { type EventListItem } from "./SwipeableEventRow";
import { eventNoun, isUpcomingEvent } from "@/lib/events";

interface Props {
  events: EventListItem[];
  userId: string;
  emptyText?: string;
}

export default function EventList({ events: initialEvents, userId, emptyText = "Nothing here yet." }: Props) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [pendingDelete, setPendingDelete] = useState<
    { id: string; title: string; type: string } | null
  >(null);
  const [deleting, setDeleting] = useState(false);

  async function doDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    const res = await fetch(`/api/shows/${pendingDelete.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      setEvents((prev) => prev.filter((e) => e.id !== pendingDelete.id));
      setPendingDelete(null);
      router.refresh();
    }
  }

  // Compare by calendar day, not instant, so an event happening today counts
  // as upcoming for the whole day.
  const upcoming = events.filter(isUpcomingEvent);
  const past = events.filter((e) => !isUpcomingEvent(e));

  return (
    <>
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-zinc-400 mb-3">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="text-zinc-500 text-sm">{emptyText}</p>
        ) : (
          <div className="space-y-3">
            {upcoming.map((event) => (
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
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-zinc-600 mb-3">Past / Cancelled</h2>
          <div className="space-y-3">
            {past.map((event) => (
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
        </section>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title={`Delete this ${pendingDelete ? eventNoun(pendingDelete.type) : "event"}?`}
        message={
          <>
            {pendingDelete && (
              <>
                &ldquo;{pendingDelete.title}&rdquo; and everyone&apos;s availability
                responses for it will be removed. This can&apos;t be undone.
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
