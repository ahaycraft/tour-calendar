import { describe, expect, it } from "vitest";
import {
  buildCalendar,
  googleCalendarUrl,
  icsFilename,
  type CalendarEventInput,
} from "@/lib/calendar";

const APP_URL = "https://woodshed.test";

function makeEvent(
  overrides: Partial<CalendarEventInput> = {}
): CalendarEventInput {
  return {
    id: "evt1",
    type: "SHOW",
    title: "The Roxy",
    status: "CONFIRMED",
    date: new Date("2026-06-15T00:00:00Z"),
    loadInTime: null,
    doorsTime: null,
    setTime: null,
    venue: null,
    city: null,
    state: null,
    country: "US",
    venueAddress: null,
    notes: null,
    ...overrides,
  };
}

/** Reverse RFC 5545 line folding ("\r\n " continuation) and split to lines. */
function unfoldLines(ics: string): string[] {
  return ics.replace(/\r\n /g, "").split("\r\n");
}

/** The single value line beginning with `KEY:` or `KEY;` (already unfolded). */
function line(ics: string, key: string): string | undefined {
  return unfoldLines(ics).find(
    (l) => l.startsWith(`${key}:`) || l.startsWith(`${key};`)
  );
}

describe("icsFilename", () => {
  it("slugifies to lowercase, collapsing runs of non-alphanumerics to one dash", () => {
    expect(icsFilename("Woodshed Events")).toBe("woodshed-events.ics");
    expect(icsFilename("Fall Tour 2026!!")).toBe("fall-tour-2026.ics");
  });

  it("trims leading and trailing dashes", () => {
    expect(icsFilename("  --Spring--  ")).toBe("spring.ics");
  });

  it("caps the slug at 60 characters", () => {
    const slug = icsFilename("a".repeat(200)).replace(/\.ics$/, "");
    expect(slug).toHaveLength(60);
  });

  it("falls back to 'calendar' when nothing survives slugification", () => {
    expect(icsFilename("!!!")).toBe("calendar.ics");
    expect(icsFilename("")).toBe("calendar.ics");
  });
});

describe("buildCalendar — envelope", () => {
  it("wraps events in a VCALENDAR with CRLF lines and a trailing CRLF", () => {
    const ics = buildCalendar([makeEvent()], APP_URL);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("PRODID:-//Woodshed//Calendar//EN");
  });

  it("emits one VEVENT per input event", () => {
    const ics = buildCalendar(
      [makeEvent({ id: "a" }), makeEvent({ id: "b" }), makeEvent({ id: "c" })],
      APP_URL
    );
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(3);
    expect(ics.match(/END:VEVENT/g)).toHaveLength(3);
  });

  it("handles an empty event list", () => {
    const ics = buildCalendar([], APP_URL);
    expect(ics).not.toContain("BEGIN:VEVENT");
    expect(ics).toContain("BEGIN:VCALENDAR");
  });
});

describe("buildCalendar — timing", () => {
  it("is all-day when no time is set: DATE-valued DTSTART and an exclusive next-day DTEND", () => {
    const ics = buildCalendar([makeEvent()], APP_URL);
    expect(line(ics, "DTSTART")).toBe("DTSTART;VALUE=DATE:20260615");
    expect(line(ics, "DTEND")).toBe("DTEND;VALUE=DATE:20260616");
  });

  it("uses floating local stamps (no Z) when a time is set", () => {
    const ics = buildCalendar(
      [
        makeEvent({
          loadInTime: new Date("2026-06-15T19:00:00Z"),
          setTime: new Date("2026-06-15T22:30:00Z"),
        }),
      ],
      APP_URL
    );
    // TZ is pinned to UTC, so local wall-clock == the UTC time shown above.
    expect(line(ics, "DTSTART")).toBe("DTSTART:20260615T190000");
    expect(line(ics, "DTEND")).toBe("DTEND:20260615T223000");
  });

  it("defaults to a 3-hour block when only a start time is set", () => {
    const ics = buildCalendar(
      [makeEvent({ loadInTime: new Date("2026-06-15T19:00:00Z") })],
      APP_URL
    );
    expect(line(ics, "DTSTART")).toBe("DTSTART:20260615T190000");
    expect(line(ics, "DTEND")).toBe("DTEND:20260615T220000");
  });

  it("falls back through doorsTime then setTime for the start", () => {
    const ics = buildCalendar(
      [makeEvent({ doorsTime: new Date("2026-06-15T20:00:00Z") })],
      APP_URL
    );
    expect(line(ics, "DTSTART")).toBe("DTSTART:20260615T200000");
  });
});

describe("buildCalendar — status", () => {
  it("CONFIRMED: no summary prefix, STATUS:CONFIRMED", () => {
    const ics = buildCalendar([makeEvent({ status: "CONFIRMED" })], APP_URL);
    expect(line(ics, "SUMMARY")).toBe("SUMMARY:The Roxy");
    expect(line(ics, "STATUS")).toBe("STATUS:CONFIRMED");
  });

  it("PENDING: [Pending] prefix, STATUS:TENTATIVE", () => {
    const ics = buildCalendar([makeEvent({ status: "PENDING" })], APP_URL);
    expect(line(ics, "SUMMARY")).toBe("SUMMARY:[Pending] The Roxy");
    expect(line(ics, "STATUS")).toBe("STATUS:TENTATIVE");
  });

  it("CANCELLED: [Cancelled] prefix, STATUS:CANCELLED", () => {
    const ics = buildCalendar([makeEvent({ status: "CANCELLED" })], APP_URL);
    expect(line(ics, "SUMMARY")).toBe("SUMMARY:[Cancelled] The Roxy");
    expect(line(ics, "STATUS")).toBe("STATUS:CANCELLED");
  });

  it("maps any unknown status to TENTATIVE", () => {
    const ics = buildCalendar([makeEvent({ status: "WHATEVER" })], APP_URL);
    expect(line(ics, "STATUS")).toBe("STATUS:TENTATIVE");
  });
});

describe("buildCalendar — location", () => {
  it("uses venue + explicit address when an address is present", () => {
    const ics = buildCalendar(
      [
        makeEvent({
          venue: "The Roxy",
          venueAddress: "9009 Sunset Blvd, West Hollywood, CA",
          city: "West Hollywood",
        }),
      ],
      APP_URL
    );
    expect(line(ics, "LOCATION")).toBe(
      "LOCATION:The Roxy\\, 9009 Sunset Blvd\\, West Hollywood\\, CA"
    );
  });

  it("builds venue, city, state, country when there is no address", () => {
    const ics = buildCalendar(
      [
        makeEvent({
          venue: "The Roxy",
          city: "West Hollywood",
          state: "CA",
          country: "US",
        }),
      ],
      APP_URL
    );
    expect(line(ics, "LOCATION")).toBe(
      "LOCATION:The Roxy\\, West Hollywood\\, CA\\, US"
    );
  });

  it("omits the LOCATION line entirely when there's no venue or city", () => {
    const ics = buildCalendar([makeEvent()], APP_URL);
    expect(line(ics, "LOCATION")).toBeUndefined();
  });
});

describe("buildCalendar — identity and description per type", () => {
  it("UID and URL reference the event id and the type's route", () => {
    const ics = buildCalendar(
      [makeEvent({ id: "rec9", type: "RECORDING" })],
      APP_URL
    );
    expect(line(ics, "UID")).toBe("UID:rec9@woodshed");
    expect(line(ics, "URL")).toBe(`URL:${APP_URL}/recordings/rec9`);
  });

  it.each([
    ["SHOW", "/shows", "Show"],
    ["RECORDING", "/recordings", "Recording session"],
    ["PRACTICE", "/practices", "Practice"],
  ] as const)("%s description names the type and links the route", (type, base, noun) => {
    const ics = buildCalendar([makeEvent({ id: "x1", type })], APP_URL);
    const desc = line(ics, "DESCRIPTION")!;
    expect(desc).toContain(`${noun} in Woodshed:`);
    expect(desc).toContain(`${APP_URL}${base}/x1`);
  });

  it("prepends notes (trimmed) before the standard description block", () => {
    const ics = buildCalendar(
      [makeEvent({ notes: "  Park in the back lot.  " })],
      APP_URL
    );
    const desc = line(ics, "DESCRIPTION")!;
    expect(desc.startsWith("DESCRIPTION:Park in the back lot.\\n\\n")).toBe(true);
  });
});

describe("buildCalendar — text escaping and folding", () => {
  it("escapes backslash, comma and semicolon in SUMMARY", () => {
    const ics = buildCalendar(
      [makeEvent({ title: "A; B, C \\ D" })],
      APP_URL
    );
    expect(line(ics, "SUMMARY")).toBe("SUMMARY:A\\; B\\, C \\\\ D");
  });

  it("folds a long line and it unfolds back to the original value", () => {
    const title = "x".repeat(120);
    const ics = buildCalendar([makeEvent({ title })], APP_URL);

    // The raw payload must contain a folded continuation ("\r\n ").
    expect(ics).toMatch(/SUMMARY:x+\r\n x+/);
    // ...and every raw line is within the 75-octet limit.
    for (const raw of ics.split("\r\n")) {
      expect(Buffer.byteLength(raw, "utf8")).toBeLessThanOrEqual(75);
    }
    // ...and unfolding restores it exactly.
    expect(line(ics, "SUMMARY")).toBe(`SUMMARY:${title}`);
  });

  it("never splits a multi-byte UTF-8 sequence across a fold", () => {
    const title = "🎸".repeat(30); // 4 bytes each, crosses several fold points
    const ics = buildCalendar([makeEvent({ title })], APP_URL);

    for (const raw of ics.split("\r\n")) {
      expect(Buffer.byteLength(raw, "utf8")).toBeLessThanOrEqual(75);
    }
    // A broken split would produce U+FFFD replacement characters on decode.
    expect(line(ics, "SUMMARY")).toBe(`SUMMARY:${title}`);
    expect(ics).not.toContain("�");
  });
});

describe("googleCalendarUrl", () => {
  it("is a TEMPLATE link with an all-day date range for an untimed event", () => {
    const url = new URL(googleCalendarUrl(makeEvent(), APP_URL));
    expect(url.origin + url.pathname).toBe(
      "https://calendar.google.com/calendar/render"
    );
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("dates")).toBe("20260615/20260616");
    expect(url.searchParams.get("text")).toBe("The Roxy");
  });

  it("emits an absolute UTC range (trailing Z) for a timed event", () => {
    const url = new URL(
      googleCalendarUrl(
        makeEvent({
          loadInTime: new Date("2026-06-15T19:00:00Z"),
          setTime: new Date("2026-06-15T22:00:00Z"),
        }),
        APP_URL
      )
    );
    expect(url.searchParams.get("dates")).toBe(
      "20260615T190000Z/20260615T220000Z"
    );
  });

  it("carries the status prefix in text and the venue in location", () => {
    const url = new URL(
      googleCalendarUrl(
        makeEvent({ status: "PENDING", venue: "The Roxy", city: "West Hollywood" }),
        APP_URL
      )
    );
    expect(url.searchParams.get("text")).toBe("[Pending] The Roxy");
    expect(url.searchParams.get("location")).toBe(
      "The Roxy, West Hollywood, US"
    );
  });

  it("omits location when the event has no venue or city", () => {
    const url = new URL(googleCalendarUrl(makeEvent(), APP_URL));
    expect(url.searchParams.has("location")).toBe(false);
  });

  it("puts the event link in details", () => {
    const url = new URL(
      googleCalendarUrl(makeEvent({ id: "p3", type: "PRACTICE" }), APP_URL)
    );
    expect(url.searchParams.get("details")).toContain(
      `${APP_URL}/practices/p3`
    );
  });
});
