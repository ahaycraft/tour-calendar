import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** True if `pathname` is `href` or a route nested under it. */
export function pathMatches(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
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
    day: "numeric"
  });
}

export function formatTime(date: Date | string | null | undefined) {
  if (!date) return null;
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}

/** 225 -> "3:45". Empty string for null/undefined/negative/non-finite input. */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** "3:45" -> 225. Null for empty, unparsable, or an out-of-range ("3:75")
 *  seconds part — never NaN, so callers can store the result directly. */
export function parseDuration(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d+):(\d{1,2})$/);
  if (!match) return null;
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  if (seconds > 59) return null;
  return minutes * 60 + seconds;
}

/** Total seconds -> "42 min" / "1 hr" / "1 hr 12 min", for an album/release
 *  summary. Rounds to the nearest minute first. */
export function formatTotalDuration(totalSeconds: number): string {
  const totalMinutes = Math.round(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}
