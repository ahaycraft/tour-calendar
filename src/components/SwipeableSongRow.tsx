"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSwipeable } from "react-swipeable";
import { Disc3, MessageSquare, Trash2 } from "lucide-react";
import { format } from "date-fns";
import SongStatusBadge from "./SongStatusBadge";
import { useIsTouchDevice } from "@/lib/useIsTouchDevice";

interface Song {
  id: string;
  title: string;
  status: string;
  key: string | null;
  tempo: number | null;
  timeSig: string | null;
  updatedAt: string;
  commentCount: number;
  tracks: { release: { id: string; title: string } }[];
}

// Width (px) of the delete action revealed behind the row.
const REVEAL_PX = 88;

export default function SwipeableSongRow({
  song,
  canDelete,
  awaitingConfirm,
  onDeleteRequest,
}: {
  song: Song;
  canDelete: boolean;
  // True while the delete-confirmation dialog is open for this row.
  awaitingConfirm: boolean;
  onDeleteRequest: (song: { id: string; title: string }) => void;
}) {
  const router = useRouter();
  const isTouch = useIsTouchDevice();
  const href = `/songs/${song.id}`;
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
          <span className="font-semibold text-zinc-100">{song.title}</span>
          <SongStatusBadge status={song.status} />
          {song.tracks.map((t) => (
            <span
              key={t.release.id}
              className="inline-flex items-center gap-1 text-[11px] text-zinc-400 bg-zinc-800 rounded px-1.5 py-0.5"
            >
              <Disc3 size={11} />
              {t.release.title}
            </span>
          ))}
        </div>
        <p className="text-xs text-zinc-500 mt-0.5">
          {[song.key, song.tempo ? `${song.tempo} BPM` : null, song.timeSig]
            .filter(Boolean)
            .join(" · ") || "No details yet"}
          {" · "}
          edited {format(new Date(song.updatedAt), "MMM d")}
        </p>
      </div>
      {song.commentCount > 0 && (
        <span className="flex items-center gap-1 text-xs text-zinc-500 shrink-0">
          <MessageSquare size={13} />
          {song.commentCount}
        </span>
      )}
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
        onClick={() => onDeleteRequest({ id: song.id, title: song.title })}
        aria-label={`Delete ${song.title}`}
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
