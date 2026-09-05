"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical, ListChecks, Loader2, Plus, Trash2, X } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import DatePicker from "./DatePicker";
import SongStatusBadge from "./SongStatusBadge";
import {
  RELEASE_KINDS,
  RELEASE_STATUSES,
  releaseKindLabel,
  releaseStatusLabel,
} from "@/lib/releases";

interface SongLite {
  id: string;
  title: string;
  status: string;
}

interface ReleaseData {
  id: string;
  title: string;
  kind: string;
  status: string;
  targetDate: string; // yyyy-MM-dd or ""
  notes: string;
}

const fieldClass =
  "w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

// Compact controls in the release meta row (kind / status / target date).
const metaFieldClass =
  "px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded-md text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500";

type SaveState = "idle" | "saving" | "saved" | "error";

function SortableRow({
  id,
  children,
}: {
  id: string;
  children: (handleProps: React.HTMLAttributes<HTMLElement>) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-40" : undefined}
    >
      {children({ ...attributes, ...listeners })}
    </li>
  );
}

export default function ReleaseEditor({
  release,
  initialTrackIds,
  songs,
  canDelete,
}: {
  release: ReleaseData;
  initialTrackIds: string[];
  songs: SongLite[];
  canDelete: boolean;
}) {
  const router = useRouter();
  const songMap = useMemo(() => new Map(songs.map((s) => [s.id, s])), [songs]);

  // ---- metadata (autosaves) ----
  const [meta, setMeta] = useState({
    title: release.title,
    kind: release.kind,
    status: release.status,
    targetDate: release.targetDate,
    notes: release.notes,
  });
  const [metaSave, setMetaSave] = useState<SaveState>("idle");
  const metaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const metaRef = useRef(meta);
  useEffect(() => {
    metaRef.current = meta;
  }, [meta]);

  const flushMeta = useCallback(async () => {
    const m = metaRef.current;
    if (!m.title.trim()) return;
    setMetaSave("saving");
    try {
      const res = await fetch(`/api/releases/${release.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(m),
      });
      setMetaSave(res.ok ? "saved" : "error");
      if (res.ok) router.refresh();
    } catch {
      setMetaSave("error");
    }
  }, [release.id, router]);

  function setMetaField<K extends keyof typeof meta>(k: K, v: string) {
    setMeta((m) => ({ ...m, [k]: v }));
    setMetaSave("idle");
    if (metaTimer.current) clearTimeout(metaTimer.current);
    metaTimer.current = setTimeout(flushMeta, 900);
  }

  // ---- tracklist (saves on every drop) ----
  const [trackIds, setTrackIds] = useState<string[]>(initialTrackIds);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [trackSave, setTrackSave] = useState<SaveState>("idle");
  const savedTrackIds = useRef<string[]>(initialTrackIds);
  const trackIdsRef = useRef(trackIds);
  useEffect(() => {
    trackIdsRef.current = trackIds;
  }, [trackIds]);

  const poolIds = useMemo(
    () => songs.map((s) => s.id).filter((id) => !trackIds.includes(id)),
    [songs, trackIds]
  );

  const persistTracks = useCallback(async () => {
    const ids = trackIdsRef.current;
    if (ids.join() === savedTrackIds.current.join()) return;
    setTrackSave("saving");
    try {
      const res = await fetch(`/api/releases/${release.id}/tracks`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songIds: ids }),
      });
      if (res.ok) {
        savedTrackIds.current = ids;
        setTrackSave("saved");
        router.refresh();
      } else {
        setTrackIds(savedTrackIds.current); // revert
        setTrackSave("error");
      }
    } catch {
      setTrackIds(savedTrackIds.current);
      setTrackSave("error");
    }
  }, [release.id, router]);

  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const schedulePersist = useCallback(() => {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(persistTracks, 250);
  }, [persistTracks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function containerOf(id: string): "tracklist" | "pool" | null {
    if (id === "tracklist" || id === "pool") return id;
    if (trackIds.includes(id)) return "tracklist";
    if (poolIds.includes(id)) return "pool";
    return null;
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const from = containerOf(activeId);
    const to = containerOf(overId);
    if (!from || !to || from === to) return;

    if (to === "tracklist") {
      // pool -> tracklist: insert at the hovered position
      setTrackIds((ids) => {
        if (ids.includes(activeId)) return ids;
        const overIndex = ids.indexOf(overId);
        const insertAt = overIndex >= 0 ? overIndex : ids.length;
        const next = [...ids];
        next.splice(insertAt, 0, activeId);
        return next;
      });
    } else {
      // tracklist -> pool: drop it from the list
      setTrackIds((ids) => ids.filter((id) => id !== activeId));
    }
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (over) {
      const activeId = String(active.id);
      const overId = String(over.id);
      if (
        containerOf(activeId) === "tracklist" &&
        containerOf(overId) === "tracklist" &&
        activeId !== overId
      ) {
        setTrackIds((ids) => {
          const oldI = ids.indexOf(activeId);
          const newI = ids.indexOf(overId);
          return oldI < 0 || newI < 0 ? ids : arrayMove(ids, oldI, newI);
        });
      }
    }
    schedulePersist();
  }

  function addToTracklist(id: string) {
    setTrackIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
    schedulePersist();
  }
  function removeFromTracklist(id: string) {
    setTrackIds((ids) => ids.filter((x) => x !== id));
    schedulePersist();
  }

  // save pending metadata edit on tab-hide / unmount
  useEffect(() => {
    function onHide() {
      if (document.visibilityState === "hidden" && metaTimer.current) {
        clearTimeout(metaTimer.current);
        flushMeta();
      }
    }
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      if (metaTimer.current) clearTimeout(metaTimer.current);
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, [flushMeta]);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  async function doDelete() {
    setDeleting(true);
    await fetch(`/api/releases/${release.id}`, { method: "DELETE" });
    router.push("/releases");
    router.refresh();
  }

  const titleMissing = !meta.title.trim();
  const activeSong = activeId ? songMap.get(activeId) : null;

  return (
    <div>
      <div className="mb-5">
        <input
          value={meta.title}
          onChange={(e) => setMetaField("title", e.target.value)}
          placeholder="Release title"
          className="w-full bg-transparent text-2xl font-bold text-zinc-50 placeholder:text-zinc-600 focus:outline-none"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/releases/${release.id}/recording`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 font-medium transition-colors"
          >
            <ListChecks size={14} />
            Tracking plan
          </Link>
        </div>
      </div>

      <div className="flex items-center flex-wrap gap-2.5 mb-6 text-xs">
        <select
          value={meta.kind}
          onChange={(e) => setMetaField("kind", e.target.value)}
          className={metaFieldClass}
        >
          {RELEASE_KINDS.map((k) => (
            <option key={k} value={k}>
              {releaseKindLabel[k]}
            </option>
          ))}
        </select>
        <select
          value={meta.status}
          onChange={(e) => setMetaField("status", e.target.value)}
          className={metaFieldClass}
        >
          {RELEASE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {releaseStatusLabel[s]}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1.5 text-zinc-500">
          Target
          <DatePicker
            label="Target date"
            hideLabel
            value={meta.targetDate}
            onChange={(value) => setMetaField("targetDate", value)}
            buttonClassName={metaFieldClass}
          />
        </div>
        <span className="text-zinc-600">
          {titleMissing ? (
            <span className="text-amber-400">Add a title to save</span>
          ) : metaSave === "saving" ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" /> Saving…
            </span>
          ) : metaSave === "saved" ? (
            <span className="inline-flex items-center gap-1 text-zinc-500">
              <Check size={12} /> Saved
            </span>
          ) : metaSave === "error" ? (
            <span className="text-red-400">Couldn&apos;t save</span>
          ) : null}
        </span>
      </div>

      <DndContext
        id={`tracklist-${release.id}`}
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="grid gap-6 lg:grid-cols-2 items-start">
          {/* Tracklist */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-200">
                Tracklist{" "}
                <span className="text-zinc-600 font-normal">{trackIds.length}</span>
              </h2>
              <span className="text-xs text-zinc-600">
                {trackSave === "saving" ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 size={11} className="animate-spin" /> Saving…
                  </span>
                ) : trackSave === "saved" ? (
                  <span className="inline-flex items-center gap-1">
                    <Check size={11} /> Saved
                  </span>
                ) : trackSave === "error" ? (
                  <span className="text-red-400">Save failed</span>
                ) : null}
              </span>
            </div>

            <DroppableList id="tracklist" empty={trackIds.length === 0} emptyLabel="Drag songs here">
              <SortableContext items={trackIds} strategy={verticalListSortingStrategy}>
                <ul className="space-y-1.5">
                  {trackIds.map((id, i) => {
                    const s = songMap.get(id);
                    if (!s) return null;
                    return (
                      <SortableRow key={id} id={id}>
                        {(handleProps) => (
                          <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-800/40 pl-2 pr-1 py-2.5">
                            <button
                              type="button"
                              className="p-1.5 -m-1.5 text-zinc-600 hover:text-zinc-300 cursor-grab active:cursor-grabbing touch-none"
                              aria-label="Drag to reorder"
                              {...handleProps}
                            >
                              <GripVertical size={15} />
                            </button>
                            <span className="w-5 text-right text-xs tabular-nums text-zinc-600">
                              {i + 1}
                            </span>
                            <Link
                              href={`/songs/${s.id}`}
                              className="flex-1 min-w-0 truncate text-sm text-zinc-100 hover:text-blue-400 hover:underline underline-offset-2"
                            >
                              {s.title}
                            </Link>
                            <SongStatusBadge status={s.status} />
                            <button
                              type="button"
                              onClick={() => removeFromTracklist(id)}
                              className="text-zinc-600 hover:text-red-400 p-1"
                              aria-label="Remove from tracklist"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}
                      </SortableRow>
                    );
                  })}
                </ul>
              </SortableContext>
            </DroppableList>
          </div>

          {/* Song pool */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <h2 className="text-sm font-semibold text-zinc-200 mb-3">
              Songs{" "}
              <span className="text-zinc-600 font-normal">{poolIds.length}</span>
            </h2>
            <DroppableList
              id="pool"
              empty={poolIds.length === 0}
              emptyLabel="Every song is on this release"
            >
              <SortableContext items={poolIds} strategy={verticalListSortingStrategy}>
                <ul className="space-y-1.5">
                  {poolIds.map((id) => {
                    const s = songMap.get(id);
                    if (!s) return null;
                    return (
                      <SortableRow key={id} id={id}>
                        {(handleProps) => (
                          <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-800/40 pl-2 pr-1 py-2.5">
                            <button
                              type="button"
                              className="p-1.5 -m-1.5 text-zinc-600 hover:text-zinc-300 cursor-grab active:cursor-grabbing touch-none"
                              aria-label="Drag onto the tracklist"
                              {...handleProps}
                            >
                              <GripVertical size={15} />
                            </button>
                            <Link
                              href={`/songs/${s.id}`}
                              className="flex-1 min-w-0 truncate text-sm text-zinc-200 hover:text-blue-400 hover:underline underline-offset-2"
                            >
                              {s.title}
                            </Link>
                            <SongStatusBadge status={s.status} />
                            <button
                              type="button"
                              onClick={() => addToTracklist(id)}
                              className="text-zinc-500 hover:text-blue-400 p-1"
                              aria-label="Add to tracklist"
                            >
                              <Plus size={15} />
                            </button>
                          </div>
                        )}
                      </SortableRow>
                    );
                  })}
                </ul>
              </SortableContext>
            </DroppableList>
          </div>
        </div>

        <DragOverlay>
          {activeSong ? (
            <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 pl-2 pr-3 py-1.5 shadow-xl">
              <GripVertical size={15} className="text-zinc-500" />
              <span className="text-sm text-zinc-100">{activeSong.title}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <div className="mt-6">
        <label className="block text-sm font-medium text-zinc-300 mb-1">Notes</label>
        <textarea
          value={meta.notes}
          onChange={(e) => setMetaField("notes", e.target.value)}
          rows={4}
          className={`${fieldClass} resize-y`}
          placeholder="Sequencing thoughts, deadlines, who's mixing…"
        />
      </div>

      {canDelete && (
        <div className="mt-10 pt-6 border-t border-zinc-800">
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-red-400 font-medium transition-colors"
          >
            <Trash2 size={14} />
            Delete release
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete this release?"
        message="The release and its tracklist are removed. The songs themselves stay in your library."
        confirmLabel="Delete"
        tone="danger"
        busy={deleting}
        onConfirm={doDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}

function DroppableList({
  id,
  empty,
  emptyLabel,
  children,
}: {
  id: string;
  empty: boolean;
  emptyLabel: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-24 rounded-lg transition-colors ${
        isOver ? "bg-blue-500/5 outline outline-1 outline-blue-500/30" : ""
      }`}
    >
      {empty ? (
        <p className="text-xs text-zinc-600 py-8 text-center">{emptyLabel}</p>
      ) : (
        children
      )}
    </div>
  );
}
