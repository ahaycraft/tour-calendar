"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ListMusic, Plus, X } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";

interface Song {
  id: string;
  title: string;
}

interface Template {
  id: string;
  name: string;
}

function SortableSongRow({
  id,
  title,
  onRemove
}: {
  id: string;
  title: string;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-800/40 pl-2 pr-1 py-2 ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <button
        type="button"
        className="p-1.5 -m-1.5 text-zinc-600 hover:text-zinc-300 cursor-grab active:cursor-grabbing touch-none"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </button>
      <span className="flex-1 min-w-0 truncate text-sm text-zinc-100">{title}</span>
      <button
        type="button"
        onClick={onRemove}
        className="text-zinc-600 hover:text-red-400 p-1"
        aria-label={`Remove ${title}`}
      >
        <X size={13} />
      </button>
    </li>
  );
}

export default function ShowSetlistCard({
  showId,
  initialSourceName,
  initialSongs,
  templates,
  canEdit
}: {
  showId: string;
  initialSourceName: string | null;
  initialSongs: Song[];
  templates: Template[];
  canEdit: boolean;
}) {
  const [sourceName, setSourceName] = useState(initialSourceName);
  const [songs, setSongs] = useState<Song[]>(initialSongs);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [applying, setApplying] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  async function addSong(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setAdding(true);
    const res = await fetch(`/api/shows/${showId}/setlist/songs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle })
    });
    setAdding(false);
    if (res.ok) {
      const song = await res.json();
      setSongs((prev) => [...prev, { id: song.id, title: song.title }]);
      setNewTitle("");
    }
  }

  async function removeSong(id: string) {
    setSongs((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/shows/${showId}/setlist/songs/${id}`, { method: "DELETE" });
  }

  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function schedulePersistOrder(ids: string[]) {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      void fetch(`/api/shows/${showId}/setlist/songs`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songIds: ids })
      });
    }, 250);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setSongs((prev) => {
      const oldIndex = prev.findIndex((s) => s.id === active.id);
      const newIndex = prev.findIndex((s) => s.id === over.id);
      const next = arrayMove(prev, oldIndex, newIndex);
      schedulePersistOrder(next.map((s) => s.id));
      return next;
    });
  }

  async function applyTemplate(setlistId: string) {
    setApplying(true);
    const res = await fetch(`/api/shows/${showId}/setlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setlistId })
    });
    setApplying(false);
    setPendingTemplateId(null);
    if (res.ok) {
      const data = await res.json();
      setSourceName(data.sourceSetlistName);
      setSongs(data.songs.map((s: Song) => ({ id: s.id, title: s.title })));
      setSelectedTemplateId("");
    }
  }

  function onSelectTemplate(id: string) {
    if (!id) return;
    if (songs.length > 0) {
      setPendingTemplateId(id);
    } else {
      void applyTemplate(id);
    }
  }

  async function doClear() {
    setClearing(false);
    await fetch(`/api/shows/${showId}/setlist`, { method: "DELETE" });
    setSourceName(null);
    setSongs([]);
  }

  const pendingTemplateName = templates.find((t) => t.id === pendingTemplateId)?.name;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-1">
        <h2 className="font-semibold text-zinc-100 flex items-center gap-2">
          <ListMusic size={15} className="text-zinc-500" />
          Setlist
        </h2>
        {sourceName && (
          <Link
            href="/setlists"
            className="text-xs text-zinc-500 hover:text-zinc-300 truncate"
          >
            From: {sourceName}
          </Link>
        )}
      </div>

      {canEdit && templates.length > 0 && (
        <select
          value={selectedTemplateId}
          onChange={(e) => onSelectTemplate(e.target.value)}
          disabled={applying}
          className="w-full mt-2 mb-3 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">
            {songs.length > 0 ? "Apply a different template…" : "Apply a template…"}
          </option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      )}

      {songs.length === 0 ? (
        <p className="text-sm text-zinc-500 mt-2 mb-2">No songs yet.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={songs.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-1.5 mt-2">
              {songs.map((s) => (
                <SortableSongRow key={s.id} id={s.id} title={s.title} onRemove={() => removeSong(s.id)} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {canEdit && (
        <form onSubmit={addSong} className="flex gap-2 mt-3">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add a song…"
            className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={adding || !newTitle.trim()}
            aria-label="Add song"
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            <Plus size={16} />
          </button>
        </form>
      )}

      {canEdit && songs.length > 0 && (
        <button
          type="button"
          onClick={() => setClearing(true)}
          className="mt-3 text-xs text-zinc-500 hover:text-red-400"
        >
          Clear setlist
        </button>
      )}

      <ConfirmDialog
        open={!!pendingTemplateId}
        title={`Apply "${pendingTemplateName}"?`}
        message="This replaces the show's current setlist with a fresh copy of the template. The template itself, and any other show using it, is unaffected."
        confirmLabel="Apply"
        busy={applying}
        onConfirm={() => pendingTemplateId && applyTemplate(pendingTemplateId)}
        onCancel={() => setPendingTemplateId(null)}
      />

      <ConfirmDialog
        open={clearing}
        title="Clear this show's setlist?"
        message="Removes every song from this show's setlist. The template it came from, if any, is unaffected."
        confirmLabel="Clear"
        tone="danger"
        onConfirm={doClear}
        onCancel={() => setClearing(false)}
      />
    </div>
  );
}
