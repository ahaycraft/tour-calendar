import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Calendar-only fields (Show.date, MemberUnavailability.date,
 * Release.targetDate, ...) are stored anchored to UTC midnight, with no
 * time-of-day meaning. Formatting that value with `date-fns`/`Intl` reads
 * the *viewer's local* wall-clock fields off the Date object, so anyone west
 * of UTC sees the previous day. Re-anchor the same Y/M/D onto the viewer's
 * own local midnight first so every viewer sees the calendar day the value
 * was created as, regardless of their timezone.
 */
export function calendarDate(value: Date | string): Date {
  const d = new Date(value);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(date: Date | string | null | undefined) {
  if (!date) return null;
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
