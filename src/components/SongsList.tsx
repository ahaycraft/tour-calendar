"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "./ConfirmDialog";
import SwipeableSongRow from "./SwipeableSongRow";
import { SONG_STATUSES, songStatusLabel, type SongStatus } from "@/lib/songs";

interface Song {
  id: string;
  title: string;
  status: string;
  key: string | null;
  tempo: number | null;
  timeSig: string | null;
  updatedAt: string;
  commentCount: number;
  canDelete: boolean;
  tracks: { release: { id: string; title: string } }[];
}

export default function SongsList({ initialSongs }: { initialSongs: Song[] }) {
  const router = useRouter();
  const [songs, setSongs] = useState(initialSongs);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  async function doDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    const res = await fetch(`/api/songs/${pendingDelete.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      setSongs((prev) => prev.filter((s) => s.id !== pendingDelete.id));
      setPendingDelete(null);
      router.refresh();
    }
  }

  const byStatus = new Map<SongStatus, Song[]>();
  for (const s of songs) {
    const key = s.status as SongStatus;
    if (!byStatus.has(key)) byStatus.set(key, []);
    byStatus.get(key)!.push(s);
  }

  return (
    <div className="space-y-8">
      {SONG_STATUSES.filter((s) => byStatus.has(s)).map((status) => (
        <section key={status}>
          <h2 className="text-xs font-semibold text-zinc-600 uppercase tracking-wide mb-3">
            {songStatusLabel[status]}
            <span className="ml-2 text-zinc-700">{byStatus.get(status)!.length}</span>
          </h2>
          <div className="space-y-2">
            {byStatus.get(status)!.map((song) => (
              <SwipeableSongRow
                key={song.id}
                song={song}
                canDelete={song.canDelete}
                awaitingConfirm={pendingDelete?.id === song.id}
                onDeleteRequest={setPendingDelete}
              />
            ))}
          </div>
        </section>
      ))}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this song?"
        message={
          <>
            {pendingDelete && (
              <>
                &ldquo;{pendingDelete.title}&rdquo; — its lyrics, notes, demos, and
                all feedback on it will be removed. This can&apos;t be undone.
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
    </div>
  );
}
