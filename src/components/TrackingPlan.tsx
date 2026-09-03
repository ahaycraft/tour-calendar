"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ChevronRight, Loader2, Plus, Trash2 } from "lucide-react";
import SongStatusBadge from "./SongStatusBadge";
import ConfirmDialog from "./ConfirmDialog";
import { isPartDone } from "@/lib/instruments";

interface SongLite {
  id: string;
  title: string;
  status: string;
}
interface Instrument {
  id: string;
  name: string;
}
export interface PartSummary {
  songId: string;
  status: string;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export default function TrackingPlan({
  releaseId,
  planId,
  initialNotes,
  songs,
  instruments,
  partSummary,
}: {
  releaseId: string;
  planId: string | null;
  initialNotes: string;
  songs: SongLite[];
  instruments: Instrument[];
  partSummary: PartSummary[];
}) {
  const router = useRouter();

  if (!planId) {
    return <StartPlan releaseId={releaseId} />;
  }

  return (
    <ActivePlan
      key={planId}
      releaseId={releaseId}
      initialNotes={initialNotes}
      songs={songs}
      initialInstruments={instruments}
      partSummary={partSummary}
      onChanged={() => router.refresh()}
    />
  );
}

function StartPlan({ releaseId }: { releaseId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/releases/${releaseId}/recording`, {
      method: "POST",
    });
    if (!res.ok) {
      setBusy(false);
      setError("Couldn't start the plan");
      return;
    }
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-10 text-center">
      <p className="text-zinc-400 text-sm mb-4">
        No tracking plan yet. Start one to lay out which parts each song needs,
        who&apos;s tracking them, and where they stand.
      </p>
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors text-sm"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        Start tracking plan
      </button>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}

function ActivePlan({
  releaseId,
  initialNotes,
  songs,
  initialInstruments,
  partSummary,
  onChanged,
}: {
  releaseId: string;
  initialNotes: string;
  songs: SongLite[];
  initialInstruments: Instrument[];
  partSummary: PartSummary[];
  onChanged: () => void;
}) {
  const [instruments, setInstruments] = useState<Instrument[]>(initialInstruments);
  const [notes, setNotes] = useState(initialNotes);
  const [notesSave, setNotesSave] = useState<SaveState>("idle");
  const [error, setError] = useState("");
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const countsBySong = useMemo(() => {
    const map = new Map<string, { total: number; done: number }>();
    for (const p of partSummary) {
      const c = map.get(p.songId) ?? { total: 0, done: 0 };
      c.total += 1;
      if (isPartDone(p.status)) c.done += 1;
      map.set(p.songId, c);
    }
    return map;
  }, [partSummary]);

  const total = partSummary.length;
  const done = partSummary.filter((p) => isPartDone(p.status)).length;

  useEffect(() => {
    return () => {
      if (notesTimer.current) clearTimeout(notesTimer.current);
    };
  }, []);

  function onNotesChange(value: string) {
    setNotes(value);
    setNotesSave("idle");
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(async () => {
      setNotesSave("saving");
      const res = await fetch(`/api/releases/${releaseId}/recording`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: value }),
      });
      setNotesSave(res.ok ? "saved" : "error");
    }, 800);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="text-sm font-medium text-zinc-300">Progress</span>
          <span className="text-xs text-zinc-500">
            {done} / {total} tracked
          </span>
        </div>
        <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: total ? `${(done / total) * 100}%` : "0%" }}
          />
        </div>

        <label className="block text-xs font-medium text-zinc-400 mt-4 mb-1">
          Plan notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={2}
          placeholder="Studio dates, engineer, signal chain, order of attack…"
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        />
        <p className="mt-1 text-[11px] text-zinc-600 h-4">
          {notesSave === "saving" ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 size={11} className="animate-spin" /> Saving…
            </span>
          ) : notesSave === "saved" ? (
            <span className="inline-flex items-center gap-1">
              <Check size={11} /> Saved
            </span>
          ) : notesSave === "error" ? (
            <span className="text-red-400">Couldn&apos;t save notes</span>
          ) : null}
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-400 -mt-2" role="alert">
          {error}
        </p>
      )}

      {songs.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center text-sm text-zinc-400">
          This release has no songs yet. Add tracks to it first.
        </div>
      ) : (
        <ul className="rounded-2xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800 overflow-hidden">
          {songs.map((song) => {
            const c = countsBySong.get(song.id);
            return (
              <li key={song.id}>
                <Link
                  href={`/releases/${releaseId}/recording/${song.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors"
                >
                  <span className="font-medium text-zinc-100 truncate">
                    {song.title}
                  </span>
                  <SongStatusBadge status={song.status} />
                  <span className="ml-auto shrink-0 text-xs text-zinc-500">
                    {!c || c.total === 0 ? "no parts" : `${c.done}/${c.total} tracked`}
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-zinc-600" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <InstrumentManager
        instruments={instruments}
        setInstruments={setInstruments}
        onError={setError}
        onChanged={onChanged}
      />
    </div>
  );
}

function InstrumentManager({
  instruments,
  setInstruments,
  onError,
  onChanged,
}: {
  instruments: Instrument[];
  setInstruments: React.Dispatch<React.SetStateAction<Instrument[]>>;
  onError: (msg: string) => void;
  onChanged: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name || busy) return;
    setBusy(true);
    const res = await fetch(`/api/bands/instruments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setBusy(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      onError(json.error || "Couldn't add that instrument");
      return;
    }
    const created: Instrument = await res.json();
    setInstruments((prev) =>
      prev.some((i) => i.id === created.id) ? prev : [...prev, created]
    );
    setNewName("");
  }

  async function rename(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setInstruments((prev) =>
      prev.map((i) => (i.id === id ? { ...i, name: trimmed } : i))
    );
    const res = await fetch(`/api/bands/instruments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      onError(json.error || "Couldn't rename that instrument");
    }
  }

  async function archive(id: string) {
    setConfirmingId(null);
    setInstruments((prev) => prev.filter((i) => i.id !== id));
    const res = await fetch(`/api/bands/instruments/${id}`, { method: "DELETE" });
    if (!res.ok) {
      onError("Couldn't remove that instrument");
      return;
    }
    // A removed instrument may have only been archived (still referenced by
    // parts elsewhere); reload so counts stay honest.
    onChanged();
  }

  const confirming = instruments.find((i) => i.id === confirmingId);

  return (
    <details className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 group">
      <summary className="cursor-pointer text-sm font-medium text-zinc-300 select-none">
        Manage instruments
        <span className="ml-2 text-xs font-normal text-zinc-600">
          {instruments.length} in the library
        </span>
      </summary>

      <ul className="mt-3 space-y-1.5">
        {instruments.map((i) => (
          <li key={i.id} className="flex items-center gap-2">
            <input
              defaultValue={i.name}
              onBlur={(e) => {
                if (e.target.value.trim() && e.target.value.trim() !== i.name) {
                  rename(i.id, e.target.value);
                }
              }}
              className="flex-1 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setConfirmingId(i.id)}
              className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
              aria-label={`Remove ${i.name}`}
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={add} className="mt-3 flex items-center gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New instrument"
          className="flex-1 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={busy || !newName.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-1 text-sm rounded-md border border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50 transition-colors"
        >
          <Plus size={14} />
          Add
        </button>
      </form>

      <p className="mt-2 text-[11px] text-zinc-600 leading-snug">
        Removing an instrument that&apos;s already used somewhere just hides it
        from the list — existing parts keep it.
      </p>

      <ConfirmDialog
        open={confirming != null}
        title={`Remove ${confirming?.name ?? "instrument"}?`}
        message="It disappears from the pickers. Parts that already use it are unaffected."
        confirmLabel="Remove"
        tone="danger"
        onConfirm={() => confirming && archive(confirming.id)}
        onCancel={() => setConfirmingId(null)}
      />
    </details>
  );
}
