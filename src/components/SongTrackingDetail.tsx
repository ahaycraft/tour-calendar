"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import SongStatusBadge from "./SongStatusBadge";
import TrackingPartRow, { type TrackingPart } from "./TrackingPartRow";
import { isPartDone } from "@/lib/instruments";

interface Instrument {
  id: string;
  name: string;
}
interface Member {
  id: string;
  name: string;
}
interface SongLink {
  id: string;
  title: string;
}

type PartPatch = {
  label?: string | null;
  description?: string | null;
  status?: string;
  assigneeId?: string | null;
};

const NEW_INSTRUMENT = "__new__";

export default function SongTrackingDetail({
  releaseId,
  song,
  initialParts,
  instruments: initialInstruments,
  members,
  prevSong,
  nextSong,
}: {
  releaseId: string;
  song: { id: string; title: string; status: string };
  initialParts: TrackingPart[];
  instruments: Instrument[];
  members: Member[];
  prevSong: SongLink | null;
  nextSong: SongLink | null;
}) {
  const [parts, setParts] = useState<TrackingPart[]>(initialParts);
  const [instruments, setInstruments] = useState<Instrument[]>(initialInstruments);
  const [error, setError] = useState("");

  const [instrumentId, setInstrumentId] = useState("");
  const [newName, setNewName] = useState("");
  const [label, setLabel] = useState("");
  const [adding, setAdding] = useState(false);

  const done = parts.filter((p) => isPartDone(p.status)).length;

  const patchPart = useCallback(
    async (id: string, data: PartPatch) => {
      setParts((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                ...(data.label !== undefined ? { label: data.label } : {}),
                ...(data.description !== undefined
                  ? { description: data.description ?? "" }
                  : {}),
                ...(data.status !== undefined ? { status: data.status } : {}),
                ...(data.assigneeId !== undefined
                  ? {
                      assignee: data.assigneeId
                        ? members.find((m) => m.id === data.assigneeId) ?? p.assignee
                        : null,
                    }
                  : {}),
              }
            : p
        )
      );
      const res = await fetch(
        `/api/releases/${releaseId}/recording/parts/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      if (!res.ok) setError("A change didn't save — reload the page");
    },
    [releaseId, members]
  );

  const deletePart = useCallback(
    async (id: string) => {
      const snapshot = parts;
      setParts((prev) => prev.filter((p) => p.id !== id));
      const res = await fetch(
        `/api/releases/${releaseId}/recording/parts/${id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        setParts(snapshot);
        setError("Couldn't remove that part");
      }
    },
    [parts, releaseId]
  );

  async function addInstrument(name: string): Promise<Instrument | null> {
    const res = await fetch(`/api/bands/instruments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error || "Couldn't add that instrument");
      return null;
    }
    const created: Instrument = await res.json();
    setInstruments((prev) =>
      prev.some((i) => i.id === created.id) ? prev : [...prev, created]
    );
    return created;
  }

  async function submitPart(e: React.FormEvent) {
    e.preventDefault();
    if (adding) return;
    setAdding(true);
    setError("");
    try {
      let targetId = instrumentId;
      if (instrumentId === NEW_INSTRUMENT) {
        const name = newName.trim();
        if (!name) return;
        const created = await addInstrument(name);
        if (!created) return;
        targetId = created.id;
      }
      if (!targetId) return;

      const res = await fetch(`/api/releases/${releaseId}/recording/parts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          songId: song.id,
          instrumentId: targetId,
          label: label.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || "Couldn't add that part");
        return;
      }
      const created = await res.json();
      setParts((prev) => [
        ...prev,
        {
          id: created.id,
          songId: created.songId,
          label: created.label,
          description: created.description ?? "",
          status: created.status,
          instrument: created.instrument,
          assignee: created.assignee,
        },
      ]);
      setInstrumentId("");
      setNewName("");
      setLabel("");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-4">
      <Link
        href={`/releases/${releaseId}/recording`}
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-200 transition-colors"
      >
        <ChevronLeft size={16} />
        All songs
      </Link>

      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-zinc-50 truncate">{song.title}</h1>
        <SongStatusBadge status={song.status} />
        <Link
          href={`/songs/${song.id}`}
          className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
        >
          song page
        </Link>
        <span className="ml-auto shrink-0 text-xs text-zinc-500">
          {parts.length === 0 ? "no parts" : `${done}/${parts.length} tracked`}
        </span>
      </div>

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      {parts.length > 0 && (
        <div className="space-y-2">
          {parts.map((p) => (
            <TrackingPartRow
              key={p.id}
              part={p}
              members={members}
              onPatch={patchPart}
              onDelete={deletePart}
            />
          ))}
        </div>
      )}

      <form
        onSubmit={submitPart}
        className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
      >
        <select
          value={instrumentId}
          onChange={(e) => setInstrumentId(e.target.value)}
          className="px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded-md text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Add a part…</option>
          {instruments.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
          <option value={NEW_INSTRUMENT}>+ New instrument…</option>
        </select>

        {instrumentId === NEW_INSTRUMENT && (
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Instrument name"
            autoFocus
            className="px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded-md text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}

        {instrumentId && (
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="label (optional)"
            className="w-32 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded-md text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}

        {instrumentId && (
          <button
            type="submit"
            disabled={adding || (instrumentId === NEW_INSTRUMENT && !newName.trim())}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {adding ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Plus size={12} />
            )}
            Add
          </button>
        )}
      </form>

      <div className="flex items-center justify-between gap-2 pt-2">
        {prevSong ? (
          <Link
            href={`/releases/${releaseId}/recording/${prevSong.id}`}
            className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-100 transition-colors min-w-0"
          >
            <ChevronLeft size={16} className="shrink-0" />
            <span className="truncate">{prevSong.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {nextSong ? (
          <Link
            href={`/releases/${releaseId}/recording/${nextSong.id}`}
            className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-100 transition-colors min-w-0"
          >
            <span className="truncate">{nextSong.title}</span>
            <ChevronRight size={16} className="shrink-0" />
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
