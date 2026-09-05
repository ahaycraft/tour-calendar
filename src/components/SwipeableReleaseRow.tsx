"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSwipeable } from "react-swipeable";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  releaseKindLabel,
  releaseStatusClass,
  releaseStatusLabel,
  type ReleaseKind,
  type ReleaseStatus,
} from "@/lib/releases";
import { useIsTouchDevice } from "@/lib/useIsTouchDevice";

interface Release {
  id: string;
  title: string;
  kind: string;
  status: string;
  trackCount: number;
  createdAt: string;
  targetDate: string | null;
}

// Width (px) of the delete action revealed behind the row.
const REVEAL_PX = 88;

export default function SwipeableReleaseRow({
  release,
  canDelete,
  awaitingConfirm,
  onDeleteRequest,
}: {
  release: Release;
  canDelete: boolean;
  // True while the delete-confirmation dialog is open for this row.
  awaitingConfirm: boolean;
  onDeleteRequest: (release: { id: string; title: string }) => void;
}) {
  const router = useRouter();
  const isTouch = useIsTouchDevice();
  const href = `/releases/${release.id}`;
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

  const rowInner = (
    <div className="flex items-center justify-between gap-4 bg-zinc-900 p-4 hover:border-zinc-700 hover:bg-zinc-800 transition-colors">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-zinc-100">{release.title}</span>
          <span className="text-xs text-zinc-500 border border-zinc-700 rounded-full px-2 py-0.5">
            {releaseKindLabel[release.kind as ReleaseKind] ?? release.kind}
          </span>
          <span
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              releaseStatusClass[release.status as ReleaseStatus] ??
                "bg-zinc-700 text-zinc-400"
            )}
          >
            {releaseStatusLabel[release.status as ReleaseStatus] ?? release.status}
          </span>
        </div>
        <p className="text-xs text-zinc-500 mt-0.5">
          {release.trackCount} {release.trackCount === 1 ? "track" : "tracks"}
          {` · added ${format(new Date(release.createdAt), "MMM d, yyyy")}`}
          {release.targetDate
            ? ` · target ${format(new Date(release.targetDate), "MMM yyyy")}`
            : ""}
        </p>
      </div>
    </div>
  );

  if (!canDelete || !isTouch) {
    return (
      <Link
        href={href}
        className="block rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all"
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
        onClick={() => onDeleteRequest({ id: release.id, title: release.title })}
        aria-label={`Delete ${release.title}`}
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
        className="block border border-zinc-800 rounded-xl"
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
