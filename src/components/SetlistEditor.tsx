"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import {
  Check,
  ChevronLeft,
  GripVertical,
  Loader2,
  Plus,
  Trash2,
  X
} from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";

interface Song {
  id: string;
  title: string;
}

type SaveState = "idle" | "saving" | "saved" | "error";

function SortableSongRow({
  id,
  title,
  canEdit,
  onRemove
}: {
  id: string;
  title: string;
  canEdit: boolean;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-800/40 pl-2 pr-1 py-2.5 ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      {canEdit && (
        <button
          type="button"
          className="p-1.5 -m-1.5 text-zinc-600 hover:text-zinc-300 cursor-grab active:cursor-grabbing touch-none"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={15} />
        </button>
      )}
      <span className="flex-1 min-w-0 truncate text-sm text-zinc-100">{title}</span>
      {canEdit && (
        <button
          type="button"
          onClick={onRemove}
          className="text-zinc-600 hover:text-red-400 p-1"
          aria-label={`Remove ${title}`}
        >
          <X size={14} />
        </button>
      )}
    </li>
  );
}

export default function SetlistEditor({
  setlist,
  initialSongs,
  canEdit
}: {
  setlist: { id: string; name: string };
  initialSongs: Song[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(setlist.name);
  const [nameSave, setNameSave] = useState<SaveState>("idle");
  const nameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [songs, setSongs] = useState<Song[]>(initialSongs);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function scheduleNameSave(next: string) {
    setName(next);
    setNameSave("idle");
    if (nameTimer.current) clearTimeout(nameTimer.current);
    nameTimer.current = setTimeout(async () => {
      if (!next.trim()) return;
      setNameSave("saving");
      const res = await fetch(`/api/setlists/${setlist.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: next.trim() })
      });
      setNameSave(res.ok ? "saved" : "error");
      if (res.ok) router.refresh();
    }, 700);
  }

  async function addSong(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setAdding(true);
    const res = await fetch(`/api/setlists/${setlist.id}/songs`, {
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
    await fetch(`/api/setlists/${setlist.id}/songs/${id}`, { method: "DELETE" });
  }

  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function schedulePersistOrder(ids: string[]) {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      void fetch(`/api/setlists/${setlist.id}/songs`, {
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

  async function doDeleteTemplate() {
    setDeleting(true);
    await fetch(`/api/setlists/${setlist.id}`, { method: "DELETE" });
    router.push("/setlists");
    router.refresh();
  }

  return (
    <div>
      <Link
        href="/setlists"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-200 mb-6 transition-colors"
      >
        <ChevronLeft size={16} />
        Back to Setlists
      </Link>

      <input
        value={name}
        disabled={!canEdit}
        onChange={(e) => scheduleNameSave(e.target.value)}
        className="w-full bg-transparent text-2xl font-bold text-zinc-50 placeholder:text-zinc-600 focus:outline-none disabled:opacity-70"
      />
      <p className="text-xs text-zinc-600 mb-6 h-4">
        {nameSave === "saving" ? (
          <span className="inline-flex items-center gap-1">
            <Loader2 size={11} className="animate-spin" /> Saving…
          </span>
        ) : nameSave === "saved" ? (
          <span className="inline-flex items-center gap-1">
            <Check size={11} /> Saved
          </span>
        ) : nameSave === "error" ? (
          <span className="text-red-400">Couldn&apos;t save</span>
        ) : null}
      </p>

      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
        <h2 className="text-sm font-semibold text-zinc-200 mb-3">
          Songs <span className="text-zinc-600 font-normal">{songs.length}</span>
        </h2>

        {songs.length === 0 ? (
          <p className="text-xs text-zinc-600 py-8 text-center">No songs yet.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={songs.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-1.5">
                {songs.map((s) => (
                  <SortableSongRow
                    key={s.id}
                    id={s.id}
                    title={s.title}
                    canEdit={canEdit}
                    onRemove={() => removeSong(s.id)}
                  />
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
      </div>

      {canEdit && (
        <div className="mt-8 pt-6 border-t border-zinc-800">
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-red-400 font-medium transition-colors"
          >
            <Trash2 size={14} />
            Delete setlist
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmingDelete}
        title={`Delete "${name}"?`}
        message="Shows that already applied this setlist keep their own copy — only the reusable template is removed."
        confirmLabel="Delete"
        tone="danger"
        busy={deleting}
        onConfirm={doDeleteTemplate}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}
