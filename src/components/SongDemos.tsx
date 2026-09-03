"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import TrackPlayer from "./TrackPlayer";
import { cn } from "@/lib/utils";

export interface Demo {
  id: string;
  label: string | null;
  url: string;
  createdAt: string;
  createdById: string;
  createdBy: { name: string };
}

const fieldClass =
  "w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

export default function SongDemos({
  songId,
  currentUserId,
  isAdmin,
  initialDemos,
}: {
  songId: string;
  currentUserId: string;
  isAdmin: boolean;
  initialDemos: Demo[];
}) {
  const router = useRouter();
  const [demos, setDemos] = useState<Demo[]>(initialDemos);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialDemos[0]?.id ?? null
  );
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const selected = demos.find((d) => d.id === selectedId) ?? demos[0] ?? null;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const link = url.trim();
    if (!link || adding) return;
    setAdding(true);
    setError("");

    const res = await fetch(`/api/songs/${songId}/demos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: link, label: label.trim() || undefined }),
    });

    setAdding(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error || "Couldn't add that");
      return;
    }

    const created: Demo = await res.json();
    setDemos((prev) => [created, ...prev]);
    setSelectedId(created.id);
    setUrl("");
    setLabel("");
    router.refresh();
  }

  async function remove(id: string) {
    const snapshot = demos;
    const next = demos.filter((d) => d.id !== id);
    setDemos(next);
    if (selectedId === id) setSelectedId(next[0]?.id ?? null);

    const res = await fetch(`/api/songs/${songId}/demos/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setDemos(snapshot);
      setError("Couldn't remove that demo");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium text-zinc-300">Demos</h2>
        {demos.length > 0 && (
          <span className="text-xs text-zinc-600">
            {demos.length} version{demos.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {selected ? (
        <TrackPlayer url={selected.url} />
      ) : (
        <p className="text-xs text-zinc-600 leading-snug">
          No demos yet. Paste a Samply embed URL, a SoundCloud link, or a direct
          audio file below.
        </p>
      )}

      {demos.length > 0 && (
        <ul className="divide-y divide-zinc-800 rounded-lg border border-zinc-800">
          {demos.map((d) => {
            const active = selected?.id === d.id;
            const canRemove = isAdmin || d.createdById === currentUserId;
            return (
              <li key={d.id} className="flex items-center gap-2 px-3 py-2">
                <button
                  type="button"
                  onClick={() => setSelectedId(d.id)}
                  className="flex-1 min-w-0 text-left"
                >
                  <span
                    className={cn(
                      "block truncate text-sm",
                      active ? "text-blue-300 font-medium" : "text-zinc-300"
                    )}
                  >
                    {d.label || "Untitled demo"}
                  </span>
                  <span className="block truncate text-[11px] text-zinc-600">
                    {d.createdBy.name} ·{" "}
                    {formatDistanceToNow(new Date(d.createdAt), { addSuffix: true })}
                  </span>
                </button>
                {active && (
                  <span className="shrink-0 text-[10px] uppercase tracking-wide text-blue-400">
                    Playing
                  </span>
                )}
                {canRemove && (
                  <button
                    type="button"
                    onClick={() => remove(d.id)}
                    className="shrink-0 p-1 text-zinc-500 hover:text-red-400 transition-colors"
                    aria-label="Remove demo"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={add} className="flex flex-wrap items-start gap-2 pt-1">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Samply embed URL, SoundCloud, direct audio…"
          className={cn(fieldClass, "flex-1 min-w-[220px]")}
        />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (rough mix v2)"
          className={cn(fieldClass, "w-full sm:w-44")}
        />
        <button
          type="submit"
          disabled={adding || !url.trim()}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Add
        </button>
      </form>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
