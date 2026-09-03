/**
 * "Add to calendar" links for a show or recording session.
 *
 * No external library — an iCalendar VEVENT is a short, well-specified text
 * format. `buildCalendar` produces an `.ics` payload (Apple Calendar, Outlook,
 * Fantastical, Google import); `googleCalendarUrl` produces a one-tap Google
 * Calendar template link.
 *
 * Timezone handling: the app stores doors/set/load-in as wall-clock instants
 * with no timezone — "8pm" means 8pm at the venue. We emit those as *floating*
 * local times in the `.ics` (no trailing Z, no TZID), which every calendar app
 * renders in the viewer's own timezone. Events with no time set become all-day.
 * Components are read with local getters so they round-trip the value that was
 * entered regardless of the server's timezone. (Google template links don't
 * support floating times, so timed events fall back to UTC there.)
 */

/** Prisma `select` covering exactly the fields the builders below read. */
export const calendarEventSelect = {
  id: true,
  type: true,
  title: true,
  status: true,
  date: true,
  loadInTime: true,
  doorsTime: true,
  setTime: true,
  venue: true,
  city: true,
  state: true,
  country: true,
  venueAddress: true,
  notes: true,
} as const;

/** Absolute base URL for the links embedded in a calendar payload. */
export function resolveAppUrl(request: Request): string {
  return process.env.AUTH_URL?.replace(/\/$/, "") ?? new URL(request.url).origin;
}

/** `<slug>.ics`, safe to drop straight into a Content-Disposition header. */
export function icsFilename(name: string): string {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "calendar";
  return `${slug}.ics`;
}

export interface CalendarEventInput {
  id: string;
  type: string; // "SHOW" | "RECORDING"
  title: string;
  status: string; // "PENDING" | "CONFIRMED" | "CANCELLED"
  date: Date;
  loadInTime: Date | null;
  doorsTime: Date | null;
  setTime: Date | null;
  venue: string | null;
  city: string | null;
  state: string | null;
  country: string;
  venueAddress: string | null;
  notes: string | null;
}

const DEFAULT_DURATION_MS = 3 * 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, "0");

/** YYYYMMDD in local time. */
function dateStamp(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

/** YYYYMMDDTHHMMSS in local time — floating, no trailing Z. */
function floatingStamp(d: Date): string {
  return `${dateStamp(d)}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(
    d.getSeconds()
  )}`;
}

/** YYYYMMDDTHHMMSSZ in UTC — an absolute instant. */
function utcStamp(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

interface Timing {
  allDay: boolean;
  start: Date;
  end: Date;
}

function resolveTiming(e: CalendarEventInput): Timing {
  const start = e.loadInTime ?? e.doorsTime ?? e.setTime;
  if (!start) {
    // All-day: DTEND is exclusive, so it's the following day.
    return { allDay: true, start: e.date, end: addDays(e.date, 1) };
  }
  const end =
    e.setTime && e.setTime.getTime() > start.getTime()
      ? e.setTime
      : new Date(start.getTime() + DEFAULT_DURATION_MS);
  return { allDay: false, start, end };
}

function eventPath(e: CalendarEventInput): string {
  return `/${e.type === "RECORDING" ? "recordings" : "shows"}/${e.id}`;
}

function locationString(e: CalendarEventInput): string {
  const parts = e.venueAddress
    ? [e.venue, e.venueAddress]
    : [e.venue, e.city, e.state, e.venue || e.city ? e.country : null];
  return parts.filter(Boolean).join(", ");
}

const STATUS_PREFIX: Record<string, string> = {
  CANCELLED: "[Cancelled] ",
  PENDING: "[Pending] ",
};

function summary(e: CalendarEventInput): string {
  return `${STATUS_PREFIX[e.status] ?? ""}${e.title}`;
}

function description(e: CalendarEventInput, appUrl: string): string {
  const lines: string[] = [];
  if (e.notes) lines.push(e.notes.trim(), "");
  lines.push(
    `${e.type === "RECORDING" ? "Recording session" : "Show"} in Woodshed:`,
    `${appUrl}${eventPath(e)}`
  );
  return lines.join("\n");
}

// --- Google Calendar template link ---------------------------------------------

export function googleCalendarUrl(
  e: CalendarEventInput,
  appUrl: string
): string {
  const t = resolveTiming(e);
  const dates = t.allDay
    ? `${dateStamp(t.start)}/${dateStamp(t.end)}`
    : `${utcStamp(t.start)}/${utcStamp(t.end)}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: summary(e),
    dates,
    details: description(e, appUrl),
  });
  const loc = locationString(e);
  if (loc) params.set("location", loc);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// --- iCalendar (.ics) --------------------------------------------------------

function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Fold a content line to <=75 octets per RFC 5545. Continuation lines begin
 * with a single space; multi-byte UTF-8 sequences are never split.
 */
function foldLine(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const chunks: string[] = [];
  let start = 0;
  while (start < bytes.length) {
    const limit = start === 0 ? 75 : 74; // continuation's leading space counts
    let end = Math.min(start + limit, bytes.length);
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    chunks.push(bytes.subarray(start, end).toString("utf8"));
    start = end;
  }
  return chunks.join("\r\n ");
}

function icsStatus(status: string): string {
  if (status === "CONFIRMED") return "CONFIRMED";
  if (status === "CANCELLED") return "CANCELLED";
  return "TENTATIVE";
}

function eventToVevent(e: CalendarEventInput, appUrl: string): string {
  const t = resolveTiming(e);
  const rows = [
    "BEGIN:VEVENT",
    `UID:${e.id}@woodshed`,
    `DTSTAMP:${utcStamp(new Date())}`,
    t.allDay
      ? `DTSTART;VALUE=DATE:${dateStamp(t.start)}`
      : `DTSTART:${floatingStamp(t.start)}`,
    t.allDay
      ? `DTEND;VALUE=DATE:${dateStamp(t.end)}`
      : `DTEND:${floatingStamp(t.end)}`,
    `SUMMARY:${escapeText(summary(e))}`,
    `DESCRIPTION:${escapeText(description(e, appUrl))}`,
    `STATUS:${icsStatus(e.status)}`,
  ];
  const loc = locationString(e);
  if (loc) rows.push(`LOCATION:${escapeText(loc)}`);
  rows.push(`URL:${appUrl}${eventPath(e)}`);
  rows.push("END:VEVENT");
  return rows.map(foldLine).join("\r\n");
}

export function buildCalendar(
  events: CalendarEventInput[],
  appUrl: string
): string {
  return (
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Woodshed//Calendar//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      ...events.map((e) => eventToVevent(e, appUrl)),
      "END:VCALENDAR",
    ].join("\r\n") + "\r\n"
  );
}
