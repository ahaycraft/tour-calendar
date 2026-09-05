"use client";

import { useEffect, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { calendarDate, cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * A hand-rolled calendar popover standing in for <input type="date">. Mobile
 * Chrome and Safari (especially as an installed PWA) don't reliably render
 * that control's internal text against a custom background — see the git
 * history on MyAvailabilityManager for two failed CSS-only attempts. Owning
 * every pixel ourselves is the only way to guarantee it looks the same
 * everywhere.
 */
export default function DatePicker({
  label,
  value,
  onChange,
  min,
  required,
  hideLabel,
  buttonClassName,
  placeholder = "mm/dd/yyyy",
}: {
  label: string;
  value: string; // "YYYY-MM-DD", or "" for no selection
  onChange: (value: string) => void;
  min?: string; // "YYYY-MM-DD"
  required?: boolean;
  // Suppress the built-in label, for a caller that renders its own (e.g. an
  // inline "Target" label wrapping a compact field).
  hideLabel?: boolean;
  // Overrides the default button styling entirely, for a caller embedding
  // this in a differently-scaled control row (e.g. ReleaseEditor's compact
  // meta row).
  buttonClassName?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? calendarDate(value) : null;
  const minDate = min ? calendarDate(min) : null;
  const [viewMonth, setViewMonth] = useState(() => selected ?? minDate ?? new Date());

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  function openPicker() {
    setViewMonth(selected ?? minDate ?? new Date());
    setOpen(true);
  }

  function pick(day: Date) {
    onChange(toDateString(day));
    setOpen(false);
  }

  const gridStart = startOfWeek(startOfMonth(viewMonth));
  const gridEnd = endOfWeek(endOfMonth(viewMonth));
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div className={hideLabel ? undefined : "w-full sm:w-auto"}>
      {!hideLabel && (
        <label className="block text-xs text-zinc-500 mb-1">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      <button
        type="button"
        aria-label={hideLabel ? label : undefined}
        onClick={openPicker}
        className={
          buttonClassName ??
          "w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:w-auto"
        }
      >
        {selected ? (
          <span className="text-zinc-100">{format(selected, "MMM d, yyyy")}</span>
        ) : (
          <span className="text-zinc-500">{placeholder}</span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-xs bg-zinc-900 rounded-2xl border border-zinc-800 shadow-xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => setViewMonth((m) => subMonths(m, 1))}
                aria-label="Previous month"
                className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-semibold text-zinc-100">
                {format(viewMonth, "MMMM yyyy")}
              </span>
              <button
                type="button"
                onClick={() => setViewMonth((m) => addMonths(m, 1))}
                aria-label="Next month"
                className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="grid grid-cols-7 mb-1 text-center text-[11px] font-medium text-zinc-500">
              {WEEKDAY_LABELS.map((d, i) => (
                <div key={i}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {days.map((day) => {
                const disabled = minDate ? isBefore(day, minDate) : false;
                const isSelected = !!selected && isSameDay(day, selected);
                const inMonth = isSameMonth(day, viewMonth);
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    disabled={disabled}
                    onClick={() => pick(day)}
                    className={cn(
                      "aspect-square rounded-lg text-sm flex items-center justify-center transition-colors",
                      inMonth ? "text-zinc-300" : "text-zinc-700",
                      !disabled && !isSelected && "hover:bg-zinc-800",
                      disabled && "text-zinc-800 cursor-not-allowed",
                      isSelected && "bg-blue-600 text-white font-semibold"
                    )}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-3 w-full py-2 rounded-lg border border-zinc-700 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
