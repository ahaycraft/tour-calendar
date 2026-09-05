"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSwipeable } from "react-swipeable";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import ShowStatusBadge from "./ShowStatusBadge";
import AvailabilityBadge from "./AvailabilityBadge";
import NeedsDetailsBadge, { needsDetails, locationLine } from "./NeedsDetailsBadge";
import { eventHref } from "@/lib/events";
import { useIsTouchDevice } from "@/lib/useIsTouchDevice";
import { calendarDate } from "@/lib/utils";

export interface EventListItem {
  id: string;
  type: string;
  title: string;
  venue: string | null;
  city: string | null;
  state: string | null;
  date: Date | string;
  status: string;
  availability: { userId: string; status: string }[];
  canDelete: boolean;
}

// Width (px) of the delete action revealed behind the row.
const REVEAL_PX = 88;

export function DateBlock({ date, dim }: { date: Date | string; dim?: boolean }) {
  const d = calendarDate(date);
  return (
    <div
      className={`flex flex-col items-center justify-center shrink-0 w-14 rounded-lg border border-zinc-800 bg-zinc-800/70 py-2 leading-none ${
        dim ? "text-zinc-500" : ""
      }`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {format(d, "MMM")}
      </span>
      <span
        className={`my-0.5 text-xl font-bold ${dim ? "text-zinc-400" : "text-zinc-100"}`}
      >
        {format(d, "d")}
      </span>
      <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        {format(d, "EEE")}
      </span>
    </div>
  );
}

export default function SwipeableEventRow({
  event,
  userId,
  isPast,
  awaitingConfirm,
  onDeleteRequest,
}: {
  event: EventListItem;
  userId: string;
  isPast: boolean;
  // True while the delete-confirmation dialog is open for this row.
  awaitingConfirm: boolean;
  onDeleteRequest: (event: { id: string; title: string; type: string }) => void;
}) {
  const router = useRouter();
  const isTouch = useIsTouchDevice();
  const href = eventHref(event.type, event.id);
  const [offset, setOffset] = useState(0);
  const [animating, setAnimating] = useState(false);
  const revealedRef = useRef(false);
  const wasAwaitingConfirm = useRef(awaitingConfirm);

  // Cancelling (or completing) the confirm dialog should snap the row shut
  // rather than leaving it revealed for the user to swipe closed themselves.
  useEffect(() => {
    if (wasAwaitingConfirm.current && !awaitingConfirm) {
      revealedRef.current = false;
      setAnimating(true);
      setOffset(0);
    }
    wasAwaitingConfirm.current = awaitingConfirm;
  }, [awaitingConfirm]);

  const handlers = useSwipeable({
    onSwiping: (e) => {
      if (e.dir !== "Left" && e.dir !== "Right") return;
      setAnimating(false);
      const base = revealedRef.current ? -REVEAL_PX : 0;
      setOffset(Math.min(0, Math.max(-REVEAL_PX, base + e.deltaX)));
    },
    onSwiped: (e) => {
      const base = revealedRef.current ? -REVEAL_PX : 0;
      const next = Math.min(0, Math.max(-REVEAL_PX, base + e.deltaX));
      const open =
        next < -REVEAL_PX / 2 || (e.dir === "Left" && e.velocity > 0.5 && next < 0);
      revealedRef.current = open;
      setAnimating(true);
      setOffset(open ? -REVEAL_PX : 0);
    },
    trackMouse: false,
    // See SwipeableShowRow for why preventScrollOnSwipe is left off.
    delta: 15,
  });

  const rowInner = isPast ? (
    // The dimming lives on this inner wrapper, not the row's own background —
    // that background must stay fully opaque so it can never let the Delete
    // button behind it bleed through mid-swipe (see SwipeableEventRow).
    <div className="flex items-center gap-4 bg-zinc-900 p-4 transition-colors">
      <DateBlock date={event.date} dim />
      <div className="min-w-0 flex-1 opacity-60 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate font-medium text-zinc-300">
            {event.title}
          </span>
          <ShowStatusBadge status={event.status} />
        </div>
        <p className="text-sm text-zinc-500 mt-0.5 truncate">{locationLine(event)}</p>
      </div>
    </div>
  ) : (
    // Solid hover background (not a translucent one) for the same reason the
    // past-row dimming above avoids container opacity.
    <div className="flex items-center gap-4 bg-zinc-900 p-4 hover:border-zinc-700 hover:bg-zinc-800 transition-all">
      <DateBlock date={event.date} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-zinc-100 truncate">{event.title}</p>
        <div className="flex items-center gap-2 flex-wrap mt-1">
          <ShowStatusBadge status={event.status} />
          {needsDetails(event) && <NeedsDetailsBadge />}
        </div>
        <p className="text-sm text-zinc-400 mt-1 truncate">{locationLine(event)}</p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <AvailabilityBadge
          status={event.availability.find((a) => a.userId === userId)?.status ?? "PENDING"}
        />
        <span className="text-xs text-zinc-500">
          {event.availability.filter((a) => a.status === "AVAILABLE").length} available
        </span>
      </div>
    </div>
  );

  if (!event.canDelete || !isTouch) {
    return (
      <Link
        href={href}
        className="group block rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all"
      >
        {rowInner}
      </Link>
    );
  }

  function handleRowClick(e: React.MouseEvent) {
    if (revealedRef.current) {
      e.preventDefault();
      revealedRef.current = false;
      setAnimating(true);
      setOffset(0);
      return;
    }
    router.push(href);
  }

  return (
    <div className="relative overflow-hidden rounded-xl touch-pan-y">
      <button
        type="button"
        onClick={() => onDeleteRequest({ id: event.id, title: event.title, type: event.type })}
        aria-label={`Delete ${event.title}`}
        className="absolute inset-y-0 right-0 flex flex-col items-center justify-center gap-1 bg-red-600 text-white hover:bg-red-500 transition-colors"
        style={{ width: REVEAL_PX }}
      >
        <Trash2 size={16} />
        <span className="text-[11px] font-medium">Delete</span>
      </button>
      <a
        href={href}
        onClick={handleRowClick}
        {...handlers}
        className="group block border border-zinc-800 rounded-xl"
        style={{
          transform: `translateX(${offset}px)`,
          transition: animating ? "transform 200ms ease-out" : "none",
        }}
      >
        {rowInner}
      </a>
    </div>
  );
}
