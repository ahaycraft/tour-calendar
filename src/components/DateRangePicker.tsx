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
  isWithinInterval,
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

export interface DateRange {
  start: string; // "YYYY-MM-DD", or "" for no selection
  end: string; // "YYYY-MM-DD", or "" when the selection is a single day
}

/**
 * One calendar popover for picking either a single day or a range: the first
 * tap sets the start day (and counts as a complete single-day selection —
 * the popover stays open so a second tap can extend it into a range).
 * Tapping the start day again, or Done, confirms a single day. See
 * DatePicker for why this is hand-rolled instead of native inputs.
 */
export default function DateRangePicker({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: DateRange;
  onChange: (next: DateRange) => void;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const startDate = value.start ? calendarDate(value.start) : null;
  const endDate = value.end ? calendarDate(value.end) : null;
  const [viewMonth, setViewMonth] = useState(() => startDate ?? new Date());

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
    setViewMonth(startDate ?? new Date());
    setOpen(true);
  }

  function pick(day: Date) {
    // Nothing selected yet, or a complete range already exists — start over.
    if (!startDate || (startDate && endDate)) {
      onChange({ start: toDateString(day), end: "" });
      return;
    }
    // A start is set but no end yet.
    if (isBefore(day, startDate)) {
      onChange({ start: toDateString(day), end: "" });
      return;
    }
    if (isSameDay(day, startDate)) {
      setOpen(false); // Tapping the start day again confirms a single day.
      return;
    }
    onChange({ start: value.start, end: toDateString(day) });
    setOpen(false);
  }

  const gridStart = startOfWeek(startOfMonth(viewMonth));
  const gridEnd = endOfWeek(endOfMonth(viewMonth));
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const buttonLabel = !startDate
    ? null
    : !endDate || isSameDay(startDate, endDate)
      ? format(startDate, "MMM d, yyyy")
      : `${format(startDate, "MMM d")} – ${format(endDate, "MMM d, yyyy")}`;

  const hint = !startDate
    ? "Pick a start day"
    : !endDate
      ? "Pick another day for a range, or Done for one day"
      : " ";

  return (
    <div className="w-full sm:w-auto">
      <label className="block text-xs text-zinc-500 mb-1">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <button
        type="button"
        onClick={openPicker}
        className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:w-auto"
      >
        {buttonLabel ? (
          <span className="text-zinc-100">{buttonLabel}</span>
        ) : (
          <span className="text-zinc-500">mm/dd/yyyy</span>
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
            <div className="flex items-center justify-between mb-1">
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

            <p className="text-xs text-zinc-500 mb-2 text-center">{hint}</p>

            <div className="grid grid-cols-7 mb-1 text-center text-[11px] font-medium text-zinc-500">
              {WEEKDAY_LABELS.map((d, i) => (
                <div key={i}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-0.5">
              {days.map((day) => {
                const inMonth = isSameMonth(day, viewMonth);
                const isStart = !!startDate && isSameDay(day, startDate);
                const isEnd = !!endDate && isSameDay(day, endDate);
                const inRange =
                  !!startDate &&
                  !!endDate &&
                  isWithinInterval(day, { start: startDate, end: endDate });
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => pick(day)}
                    className={cn(
                      "aspect-square text-sm flex items-center justify-center transition-colors",
                      inMonth ? "text-zinc-300" : "text-zinc-700",
                      inRange && "bg-blue-600/20",
                      !inRange && !isStart && !isEnd && "hover:bg-zinc-800 rounded-lg",
                      isStart && "rounded-l-lg",
                      isEnd && "rounded-r-lg",
                      isStart && !endDate && "rounded-lg",
                      (isStart || isEnd) && "bg-blue-600 text-white font-semibold"
                    )}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex gap-2">
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => onChange({ start: "", end: "" })}
                  className="flex-1 py-2 rounded-lg border border-zinc-700 text-sm font-medium text-zinc-400 hover:bg-zinc-800 transition-colors"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 py-2 rounded-lg border border-zinc-700 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
