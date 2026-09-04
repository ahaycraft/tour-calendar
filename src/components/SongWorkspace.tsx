"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Trash2 } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import SongDemos, { type Demo } from "./SongDemos";
import { SONG_STATUSES, songStatusLabel } from "@/lib/songs";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

interface SongData {
  id: string;
  title: string;
  status: string;
  key: string;
  tempo: string;
  timeSig: string;
  lyrics: string;
  notes: string;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export default function SongWorkspace({
  song,
  canDelete,
  demos,
  currentUserId,
  demosAdmin,
  meta,
  sidebar,
}: {
  song: SongData;
  canDelete: boolean;
  demos: Demo[];
  currentUserId: string;
  demosAdmin: boolean;
  meta?: React.ReactNode;
  // Rendered beside the fields on desktop (top-aligned with the first card),
  // and directly below them on mobile.
  sidebar?: React.ReactNode;
}) {
  const router = useRouter();
  const [fields, setFields] = useState<SongData>(song);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(fields);
  useEffect(() => {
    latest.current = fields;
  }, [fields]);

  const titleMissing = !fields.title.trim();
  const statusIndex = SONG_STATUSES.indexOf(fields.status as (typeof SONG_STATUSES)[number]);

  const flush = useCallback(async () => {
    const payload = latest.current;
    if (!payload.title.trim()) return;
    setSaveState("saving");
    try {
      const res = await fetch(`/api/songs/${song.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: payload.title,
          status: payload.status,
          key: payload.key,
          tempo: payload.tempo,
          timeSig: payload.timeSig,
          lyrics: payload.lyrics,
          notes: payload.notes,
        }),
      });
      setSaveState(res.ok ? "saved" : "error");
      if (res.ok) router.refresh();
    } catch {
      setSaveState("error");
    }
  }, [song.id, router]);

  function set<K extends keyof SongData>(k: K, v: SongData[K]) {
    setFields((f) => ({ ...f, [k]: v }));
    setSaveState("idle");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 900);
  }

  // Save any pending edit if the tab is hidden or the component unmounts.
  useEffect(() => {
    function onHide() {
      if (document.visibilityState === "hidden" && timer.current) {
        clearTimeout(timer.current);
        flush();
      }
    }
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [flush]);

  async function doDelete() {
    setDeleting(true);
    await fetch(`/api/songs/${song.id}`, { method: "DELETE" });
    router.push("/songs");
    router.refresh();
  }

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4 mb-1">
        <input
          value={fields.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Song title"
          className="w-full min-w-0 sm:flex-1 bg-transparent text-2xl font-bold text-zinc-50 placeholder:text-zinc-600 focus:outline-none"
        />
        {canDelete && (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="shrink-0 self-start inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-red-400 font-medium transition-colors"
          >
            <Trash2 size={14} />
            Delete
          </button>
        )}
      </div>

      {meta && <p className="text-xs text-zinc-600 mb-4">{meta}</p>}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-6">
        <div
          role="group"
          aria-label="Song status"
          className="flex items-center gap-1 overflow-x-auto"
        >
          {SONG_STATUSES.map((s, i) => {
            const state =
              i < statusIndex ? "done" : i === statusIndex ? "current" : "todo";
            return (
              <button
                key={s}
                type="button"
                aria-current={state === "current" ? "step" : undefined}
                onClick={() => set("status", s)}
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  state === "current" && "bg-blue-600 text-white",
                  state === "done" &&
                    "bg-blue-500/15 text-blue-300 hover:bg-blue-500/25",
                  state === "todo" &&
                    "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                )}
              >
                {songStatusLabel[s]}
              </button>
            );
          })}
        </div>

        <span className="text-xs text-zinc-600">
          {titleMissing ? (
            <span className="text-amber-400">Add a title to save</span>
          ) : saveState === "saving" ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" /> Saving…
            </span>
          ) : saveState === "saved" ? (
            <span className="inline-flex items-center gap-1 text-zinc-500">
              <Check size={12} /> Saved
            </span>
          ) : saveState === "error" ? (
            <span className="text-red-400">Couldn&apos;t save — retrying on next edit</span>
          ) : (
            "Autosaves"
          )}
        </span>
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8 lg:items-start">
        <div className="space-y-6 lg:col-start-1">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="grid grid-cols-3 gap-2 max-w-xs">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Key</label>
                <input
                  value={fields.key}
                  onChange={(e) => set("key", e.target.value)}
                  className={fieldClass}
                  placeholder="C#m"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">BPM</label>
                <input
                  value={fields.tempo}
                  onChange={(e) => set("tempo", e.target.value.replace(/[^\d]/g, ""))}
                  inputMode="numeric"
                  className={fieldClass}
                  placeholder="120"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Time</label>
                <input
                  value={fields.timeSig}
                  onChange={(e) => set("timeSig", e.target.value)}
                  className={fieldClass}
                  placeholder="4/4"
                />
              </div>
            </div>
          </div>

          <SongDemos
            songId={song.id}
            currentUserId={currentUserId}
            isAdmin={demosAdmin}
            initialDemos={demos}
          />

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Lyrics</label>
            <textarea
              value={fields.lyrics}
              onChange={(e) => set("lyrics", e.target.value)}
              rows={10}
              spellCheck
              className={`${fieldClass} font-mono leading-relaxed resize-y`}
              placeholder={"[Verse 1]\n…"}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Notes</label>
            <textarea
              value={fields.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={5}
              className={`${fieldClass} resize-y`}
              placeholder="Arrangement ideas, references, who's playing what…"
            />
          </div>
        </div>

        {sidebar && (
          <div className="mt-8 lg:mt-0 lg:col-start-2">{sidebar}</div>
        )}
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete this song?"
        message="The lyrics, notes, demos, and all feedback on it will be removed. This can't be undone."
        confirmLabel="Delete"
        tone="danger"
        busy={deleting}
        onConfirm={doDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}
