"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RECORDING_PART_STATUSES,
  recordingPartStatusClass,
  recordingPartStatusLabel,
  type RecordingPartStatus,
} from "@/lib/instruments";

export interface TrackingPart {
  id: string;
  songId: string;
  label: string | null;
  description: string;
  status: string;
  instrument: { id: string; name: string };
  assignee: { id: string; name: string } | null;
}

type PartPatch = {
  label?: string | null;
  description?: string | null;
  status?: string;
  assigneeId?: string | null;
};

const fieldClass =
  "px-2 py-1 bg-zinc-800 border border-zinc-700 rounded-md text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function TrackingPartRow({
  part,
  members,
  onPatch,
  onDelete,
}: {
  part: TrackingPart;
  members: { id: string; name: string }[];
  onPatch: (id: string, data: PartPatch) => void;
  onDelete: (id: string) => void;
}) {
  // Local state keeps typing responsive; the parent debounces the actual save
  // and mirrors these fields back onto `part`, so the two stay in step.
  const [label, setLabel] = useState(part.label ?? "");
  const [description, setDescription] = useState(part.description);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const t = timers.current;
    return () => {
      Object.values(t).forEach(clearTimeout);
    };
  }, []);

  function debouncedPatch(key: "label" | "description", value: string) {
    if (timers.current[key]) clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => {
      const current = key === "label" ? part.label ?? "" : part.description;
      if (value === current) return;
      onPatch(part.id, { [key]: value });
    }, 700);
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-zinc-200">
          {part.instrument.name}
        </span>
        <input
          value={label}
          onChange={(e) => {
            setLabel(e.target.value);
            debouncedPatch("label", e.target.value);
          }}
          placeholder="label"
          className={cn(fieldClass, "w-24 placeholder:text-zinc-600")}
          aria-label="Part label"
        />

        {/* Full-width row of its own on mobile so the selects can share the
            space; right-aligned beside the label from `sm:` up. */}
        <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
          <select
            value={part.status}
            onChange={(e) => onPatch(part.id, { status: e.target.value })}
            className={cn(
              "min-w-0 px-2 py-1 rounded-md text-xs font-medium border-0 focus:outline-none focus:ring-2 focus:ring-blue-500",
              recordingPartStatusClass[part.status as RecordingPartStatus] ??
                "bg-zinc-700 text-zinc-300"
            )}
            aria-label="Part status"
          >
            {RECORDING_PART_STATUSES.map((s) => (
              <option key={s} value={s} className="bg-zinc-900 text-zinc-100">
                {recordingPartStatusLabel[s]}
              </option>
            ))}
          </select>

          <select
            value={part.assignee?.id ?? ""}
            onChange={(e) =>
              onPatch(part.id, { assigneeId: e.target.value || null })
            }
            className={cn(
              fieldClass,
              "min-w-0 flex-1 sm:flex-none sm:max-w-[9rem]"
            )}
            aria-label="Assignee"
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => onDelete(part.id)}
            className="shrink-0 p-1 text-zinc-500 hover:text-red-400 transition-colors"
            aria-label="Remove part"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <textarea
        value={description}
        onChange={(e) => {
          setDescription(e.target.value);
          debouncedPatch("description", e.target.value);
        }}
        rows={2}
        placeholder="Notes for this part — tuning, gear, take direction…"
        className="mt-2 w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded-md text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
      />
    </div>
  );
}
