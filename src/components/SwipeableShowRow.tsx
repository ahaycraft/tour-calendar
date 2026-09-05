"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useSwipeable } from "react-swipeable";
import { Check, X } from "lucide-react";
import { format } from "date-fns";
import AvailabilityBadge from "./AvailabilityBadge";
import { eventHref } from "@/lib/events";
import { locationLine } from "./NeedsDetailsBadge";
import { calendarDate } from "@/lib/utils";

interface Show {
  id: string;
  type: string;
  title: string;
  venue: string | null;
  city: string | null;
  state: string | null;
  date: string;
  myStatus: string;
}

// Distance (px) a row must travel before release counts as a response. A shorter
// flick also commits if it's fast enough (see the velocity check in onSwiped).
const COMMIT_PX = 90;

export default function SwipeableShowRow({
  show,
  onRespond,
}: {
  show: Show;
  onRespond: (showId: string, status: "AVAILABLE" | "UNAVAILABLE") => void;
}) {
  const [offset, setOffset] = useState(0);
  const [animating, setAnimating] = useState(false);
  const committedRef = useRef(false);

  // This component keeps transient gesture state (offset, the committed latch)
  // that must not outlive a status change. The parent gives us a `key` that
  // includes `myStatus`, so an Undo — or a committed swipe landing — remounts
  // us fresh at rest rather than leaving a row stuck off-screen and unslidable.
  const answered = show.myStatus !== "PENDING";

  function commit(dir: "Left" | "Right") {
    committedRef.current = true;
    setAnimating(true);
    setOffset(dir === "Right" ? window.innerWidth : -window.innerWidth);
    window.setTimeout(() => {
      onRespond(show.id, dir === "Right" ? "AVAILABLE" : "UNAVAILABLE");
    }, 180);
  }

  const handlers = useSwipeable({
    onSwiping: (e) => {
      if (committedRef.current) return;
      if (e.dir !== "Left" && e.dir !== "Right") return;
      setAnimating(false);
      setOffset(e.deltaX);
    },
    onSwiped: (e) => {
      if (committedRef.current) return;
      const far =
        Math.abs(e.deltaX) > COMMIT_PX ||
        (Math.abs(e.deltaX) > 40 && e.velocity > 0.5);
      if (far && (e.dir === "Left" || e.dir === "Right")) {
        commit(e.dir);
      } else {
        setAnimating(true);
        setOffset(0);
      }
    },
    trackMouse: false,
    // Deliberately NOT setting preventScrollOnSwipe: it attaches a non-passive
    // touchmove listener and calls preventDefault() for the whole gesture once
    // tracking starts — vertical ones included — which freezes list scrolling
    // on iOS. The `touch-pan-y` class on the <li> lets the browser own vertical
    // scroll while still handing us the horizontal delta for the slide.
    delta: 15,
  });

  const rowInner = (
    <Link
      href={eventHref(show.type, show.id)}
      className="flex items-center justify-between gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-800/60 transition-colors"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-200">{show.title}</p>
        <p className="text-xs text-zinc-500">
          {locationLine(show)} · {format(calendarDate(show.date), "MMM d, yyyy")}
        </p>
      </div>
      <AvailabilityBadge status={show.myStatus} className="shrink-0" />
    </Link>
  );

  // Once a show has a response, the slide action is retired — it renders as a
  // plain tappable row that opens the event.
  if (answered) {
    return <li>{rowInner}</li>;
  }

  const revealRight = offset > 0; // dragging right → Available
  const intensity = Math.min(Math.abs(offset) / COMMIT_PX, 1);

  return (
    <li
      {...handlers}
      className="relative overflow-hidden rounded-xl touch-pan-y"
    >
      <div
        className={`pointer-events-none absolute inset-0 flex items-center rounded-xl px-4 text-white ${
          revealRight
            ? "justify-start bg-green-600"
            : "justify-end bg-red-600"
        }`}
        style={{ opacity: offset === 0 ? 0 : 0.4 + intensity * 0.6 }}
        aria-hidden
      >
        {revealRight ? <Check size={18} /> : null}
        <span className="mx-2 text-xs font-semibold">
          {revealRight ? "Available" : "Unavailable"}
        </span>
        {revealRight ? null : <X size={18} />}
      </div>
      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: animating ? "transform 200ms ease-out" : "none",
        }}
      >
        {rowInner}
      </div>
    </li>
  );
}
