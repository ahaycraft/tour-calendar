"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
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
import {
  Check,
  ChevronDown,
  Copy,
  GripVertical,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import { cn } from "@/lib/utils";
import {
  MAX_SECTION_NAME,
  SECTION_PRESETS,
  planPresetAdd,
  sectionAccent,
} from "@/lib/arrangement";

export interface ArrangementSection {
  id: string;
  name: string;
  notes: string;
  lyrics: string;
}

type SaveState = "idle" | "saving" | "saved" | "error";

const textFieldClass =
  "w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y";

export default function SongArrangement({
  songId,
  initialSections,
}: {
  songId: string;
  initialSections: ArrangementSection[];
}) {
  const [sections, setSections] = useState<ArrangementSection[]>(initialSections);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<ArrangementSection | null>(null);
  const [save, setSave] = useState<SaveState>("idle");
  const [error, setError] = useState("");
  const [customName, setCustomName] = useState("");
  const [busy, setBusy] = useState(false);
  const [adderOpen, setAdderOpen] = useState(false);

  const savedOrder = useRef<string[]>(initialSections.map((s) => s.id));
  const orderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (orderTimer.current) clearTimeout(orderTimer.current);
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const persistOrder = useCallback(
    async (ids: string[]) => {
      if (ids.join() === savedOrder.current.join()) return;
      setSave("saving");
      try {
        const res = await fetch(`/api/songs/${songId}/sections`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: ids }),
        });
        if (res.ok) {
          savedOrder.current = ids;
          setSave("saved");
        } else {
          setSave("error");
        }
      } catch {
        setSave("error");
      }
    },
    [songId]
  );

  function scheduleOrder(ids: string[]) {
    if (orderTimer.current) clearTimeout(orderTimer.current);
    orderTimer.current = setTimeout(() => persistOrder(ids), 300);
  }

  const patchSection = useCallback(
    async (id: string, data: Partial<Omit<ArrangementSection, "id">>) => {
      setSections((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...data } : s))
      );
      setSave("saving");
      try {
        const res = await fetch(`/api/songs/${songId}/sections/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        setSave(res.ok ? "saved" : "error");
      } catch {
        setSave("error");
      }
    },
    [songId]
  );

  const addSection = useCallback(
    async (name: string, source?: ArrangementSection) => {
      if (busy) return;
      setBusy(true);
      setError("");
      setSave("saving");
      try {
        const res = await fetch(`/api/songs/${songId}/sections`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            afterId: source?.id,
            notes: source?.notes || undefined,
            lyrics: source?.lyrics || undefined,
          }),
        });
        if (!res.ok) {
          setSave("error");
          setError("Couldn't add that section");
          return;
        }
        const created = await res.json();
        const row: ArrangementSection = {
          id: created.id,
          name: created.name,
          notes: created.notes ?? "",
          lyrics: created.lyrics ?? "",
        };
        setSections((prev) => {
          const next = [...prev];
          const at = source ? next.findIndex((s) => s.id === source.id) : -1;
          if (at === -1) next.push(row);
          else next.splice(at + 1, 0, row);
          savedOrder.current = next.map((s) => s.id);
          return next;
        });
        // Show the new row's fields straight away, and the copied row's too
        // (it likely has notes/lyrics worth seeing).
        setExpanded((e) => {
          const n = new Set(e);
          n.add(row.id);
          if (source) n.add(source.id);
          return n;
        });
        setSave("saved");
      } catch {
        setSave("error");
        setError("Couldn't add that section");
      } finally {
        setBusy(false);
      }
    },
    [songId, busy]
  );

  function addPreset(preset: string) {
    const { name, promote } = planPresetAdd(preset, sections);
    if (promote) patchSection(promote.id, { name: promote.name });
    addSection(name);
  }

  function addCustom(e: React.FormEvent) {
    e.preventDefault();
    const name = customName.trim();
    if (!name) return;
    setCustomName("");
    addSection(name);
  }

  async function doDelete(id: string) {
    setConfirming(null);
    const snapshot = sections;
    const next = sections.filter((s) => s.id !== id);
    setSections(next);
    savedOrder.current = next.map((s) => s.id);
    try {
      const res = await fetch(`/api/songs/${songId}/sections/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
    } catch {
      setSections(snapshot);
      savedOrder.current = snapshot.map((s) => s.id);
      setError("Couldn't remove that section");
    }
  }

  function requestDelete(section: ArrangementSection) {
    if (section.notes.trim() || section.lyrics.trim()) setConfirming(section);
    else doDelete(section.id);
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setSections((prev) => {
      const oldI = prev.findIndex((s) => s.id === active.id);
      const newI = prev.findIndex((s) => s.id === over.id);
      if (oldI < 0 || newI < 0) return prev;
      const next = arrayMove(prev, oldI, newI);
      scheduleOrder(next.map((s) => s.id));
      return next;
    });
  }

  const activeSection = activeId
    ? sections.find((s) => s.id === activeId)
    : null;

  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-sm font-medium text-zinc-300">Arrangement</h2>
        <span className="text-xs text-zinc-600 h-4">
          {save === "saving" ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 size={11} className="animate-spin" /> Saving…
            </span>
          ) : save === "saved" ? (
            <span className="inline-flex items-center gap-1">
              <Check size={11} /> Saved
            </span>
          ) : save === "error" ? (
            <span className="text-red-400">Couldn&apos;t save</span>
          ) : null}
        </span>
      </div>

      {error && (
        <p className="mb-3 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      {sections.length > 0 && (
        <DndContext
          id={`arrangement-${songId}`}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <SortableContext
            items={sections.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-1.5 mb-3">
              {sections.map((section, i) => (
                <SortableSection key={section.id} id={section.id}>
                  {(handleProps) => (
                    <SectionRow
                      section={section}
                      index={i}
                      expanded={expanded.has(section.id)}
                      handleProps={handleProps}
                      onToggle={() =>
                        setExpanded((e) => {
                          const n = new Set(e);
                          if (n.has(section.id)) n.delete(section.id);
                          else n.add(section.id);
                          return n;
                        })
                      }
                      onPatch={patchSection}
                      onCopy={() => addSection(section.name, section)}
                      onDelete={() => requestDelete(section)}
                    />
                  )}
                </SortableSection>
              ))}
            </ul>
          </SortableContext>

          <DragOverlay>
            {activeSection ? (
              <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 pl-2 pr-3 py-2 shadow-xl">
                <GripVertical size={15} className="text-zinc-500" />
                <span className="text-sm text-zinc-100">
                  {activeSection.name}
                </span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900">
        <button
          type="button"
          onClick={() => setAdderOpen((o) => !o)}
          aria-expanded={adderOpen}
          className="flex w-full items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <Plus
            size={14}
            className={cn("transition-transform", adderOpen && "rotate-45")}
          />
          {adderOpen
            ? "Close"
            : sections.length === 0
              ? "Add a section"
              : "Add section"}
        </button>

        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-200 ease-out",
            adderOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
        >
          <div className="overflow-hidden">
            <div className="border-t border-zinc-800 px-4 pb-4 pt-3">
              {sections.length === 0 && (
                <p className="text-sm text-zinc-400 mb-3">
                  Sketch the structure — tap a part to add it.
                </p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {SECTION_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => addPreset(p)}
                    disabled={busy}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50 transition-colors"
                  >
                    <Plus size={12} />
                    {p}
                  </button>
                ))}
              </div>
              <form
                onSubmit={addCustom}
                className="mt-2.5 flex items-center gap-2"
              >
                <input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  maxLength={MAX_SECTION_NAME}
                  placeholder="Custom section…"
                  className="flex-1 px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded-md text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={busy || !customName.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                >
                  <Plus size={13} />
                  Add
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirming != null}
        title={`Delete "${confirming?.name ?? "section"}"?`}
        message="Its notes and lyrics go with it. This can't be undone."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => confirming && doDelete(confirming.id)}
        onCancel={() => setConfirming(null)}
      />
    </section>
  );
}

function SortableSection({
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

function SectionRow({
  section,
  index,
  expanded,
  handleProps,
  onToggle,
  onPatch,
  onCopy,
  onDelete,
}: {
  section: ArrangementSection;
  index: number;
  expanded: boolean;
  handleProps: React.HTMLAttributes<HTMLElement>;
  onToggle: () => void;
  onPatch: (
    id: string,
    data: Partial<Omit<ArrangementSection, "id">>
  ) => void;
  onCopy: () => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(section.name);
  const [notes, setNotes] = useState(section.notes);
  const [lyrics, setLyrics] = useState(section.lyrics);
  const nameRef = useRef<HTMLInputElement>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const t = timers.current;
    return () => {
      Object.values(t).forEach(clearTimeout);
    };
  }, []);

  // Pick up an external rename (e.g. a bare "Verse" promoted to "Verse 1" when
  // a second verse is added) without clobbering an edit in progress.
  useEffect(() => {
    if (document.activeElement !== nameRef.current) setName(section.name);
  }, [section.name]);

  function debouncedPatch(
    key: "name" | "notes" | "lyrics",
    value: string,
    delay: number
  ) {
    if (timers.current[key]) clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => {
      if (key === "name" && !value.trim()) return;
      onPatch(section.id, { [key]: value });
    }, delay);
  }

  const accent = sectionAccent(name);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-800/40">
      <div className="flex items-center gap-2 pl-2 pr-1 py-1.5">
        <button
          type="button"
          className="text-zinc-600 hover:text-zinc-300 cursor-grab active:cursor-grabbing touch-none"
          aria-label="Drag to reorder"
          {...handleProps}
        >
          <GripVertical size={15} />
        </button>
        <span
          className={cn(
            "shrink-0 w-6 text-center rounded text-[11px] leading-5 tabular-nums",
            accent
          )}
        >
          {index + 1}
        </span>
        <input
          ref={nameRef}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            debouncedPatch("name", e.target.value, 600);
          }}
          maxLength={MAX_SECTION_NAME}
          aria-label="Section name"
          className="flex-1 min-w-0 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 py-0.5"
        />
        <button
          type="button"
          onClick={onCopy}
          className="p-1.5 text-zinc-500 hover:text-zinc-200 transition-colors"
          aria-label="Duplicate section"
        >
          <Copy size={14} />
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={expanded ? "Hide notes & lyrics" : "Add notes & lyrics"}
          className="p-1.5 text-zinc-500 hover:text-zinc-200 transition-colors"
        >
          <ChevronDown
            size={15}
            className={cn("transition-transform", expanded && "rotate-180")}
          />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
          aria-label="Delete section"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-zinc-800">
          <div>
            <label className="block text-[11px] font-medium text-zinc-500 mb-1 mt-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                debouncedPatch("notes", e.target.value, 800);
              }}
              rows={2}
              placeholder="Feel, dynamics, who comes in…"
              className={textFieldClass}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-zinc-500 mb-1">
              Lyrics
            </label>
            <textarea
              value={lyrics}
              onChange={(e) => {
                setLyrics(e.target.value);
                debouncedPatch("lyrics", e.target.value, 800);
              }}
              rows={4}
              spellCheck
              className={cn(textFieldClass, "font-mono leading-relaxed")}
              placeholder="Lines for this section…"
            />
          </div>
        </div>
      )}
    </div>
  );
}
