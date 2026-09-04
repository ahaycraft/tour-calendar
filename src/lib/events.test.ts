import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EVENT_TYPES,
  eventBasePath,
  eventHref,
  eventListLabel,
  eventNoun,
  eventNounPlural,
  eventTypeLabel,
  isEventType,
  isUpcomingEvent,
  tourEditHref,
} from "@/lib/events";

describe("isEventType", () => {
  it("accepts exactly the three enum values", () => {
    expect(EVENT_TYPES).toEqual(["SHOW", "RECORDING", "PRACTICE"]);
    for (const t of EVENT_TYPES) expect(isEventType(t)).toBe(true);
  });

  it("rejects anything else, including wrong case and non-strings", () => {
    for (const v of [
      "practice",
      "show",
      "TOUR",
      "",
      undefined,
      null,
      0,
      {},
      ["SHOW"],
    ]) {
      expect(isEventType(v)).toBe(false);
    }
  });
});

describe("per-type vocabulary", () => {
  // [type, basePath, noun, nounPlural, typeLabel, listLabel]
  const table = [
    ["SHOW", "/shows", "show", "shows", "Show", "Shows"],
    ["RECORDING", "/recordings", "session", "sessions", "Recording", "Recordings"],
    ["PRACTICE", "/practices", "practice", "practices", "Practice", "Practices"],
  ] as const;

  it.each(table)(
    "%s maps to its route and words",
    (type, basePath, noun, nounPlural, typeLabel, listLabel) => {
      expect(eventBasePath(type)).toBe(basePath);
      expect(eventNoun(type)).toBe(noun);
      expect(eventNounPlural(type)).toBe(nounPlural);
      expect(eventTypeLabel(type)).toBe(typeLabel);
      expect(eventListLabel(type)).toBe(listLabel);
    }
  );

  it("falls back to show-ish defaults for an unknown type", () => {
    expect(eventBasePath("BOGUS")).toBe("/shows");
    expect(eventNoun("BOGUS")).toBe("show");
    expect(eventNounPlural("BOGUS")).toBe("shows");
    expect(eventListLabel("BOGUS")).toBe("Shows");
  });

  it("echoes an unknown type back from eventTypeLabel (it's a raw label)", () => {
    expect(eventTypeLabel("BOGUS")).toBe("BOGUS");
  });
});

describe("href builders", () => {
  it("eventHref joins the type's base path and id", () => {
    expect(eventHref("SHOW", "abc")).toBe("/shows/abc");
    expect(eventHref("RECORDING", "abc")).toBe("/recordings/abc");
    expect(eventHref("PRACTICE", "abc")).toBe("/practices/abc");
  });

  it("tourEditHref points at the block editor for the group", () => {
    expect(tourEditHref("SHOW", "grp-1")).toBe("/shows/tour/grp-1/edit");
    expect(tourEditHref("PRACTICE", "grp-1")).toBe(
      "/practices/tour/grp-1/edit"
    );
  });
});

describe("isUpcomingEvent", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Fixed "now": 2026-06-15 12:00 UTC (TZ is pinned to UTC in vitest.config).
    vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts an event earlier the same day as still upcoming (day-granularity)", () => {
    expect(
      isUpcomingEvent({ date: "2026-06-15T09:00:00Z", status: "PENDING" })
    ).toBe(true);
  });

  it("counts a future date as upcoming", () => {
    expect(
      isUpcomingEvent({ date: "2026-06-16T00:00:00Z", status: "CONFIRMED" })
    ).toBe(true);
  });

  it("excludes a past date", () => {
    expect(
      isUpcomingEvent({ date: "2026-06-14T23:59:00Z", status: "PENDING" })
    ).toBe(false);
  });

  it("excludes anything cancelled, even in the future", () => {
    expect(
      isUpcomingEvent({ date: "2026-12-31T00:00:00Z", status: "CANCELLED" })
    ).toBe(false);
  });

  it("accepts a Date as well as an ISO string", () => {
    expect(
      isUpcomingEvent({ date: new Date("2026-06-20T00:00:00Z"), status: "PENDING" })
    ).toBe(true);
  });
});
