import { describe, expect, it } from "vitest";
import { formatDuration, formatTotalDuration, parseDuration } from "@/lib/utils";

describe("formatDuration", () => {
  it("formats seconds as m:ss, padding seconds under 10", () => {
    expect(formatDuration(225)).toBe("3:45");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(5)).toBe("0:05");
  });

  it("rounds a fractional seconds value", () => {
    expect(formatDuration(65.6)).toBe("1:06");
  });

  it("returns an empty string for null/undefined/negative/non-finite", () => {
    expect(formatDuration(null)).toBe("");
    expect(formatDuration(undefined)).toBe("");
    expect(formatDuration(-5)).toBe("");
    expect(formatDuration(NaN)).toBe("");
  });
});

describe("parseDuration", () => {
  it("parses m:ss into total seconds", () => {
    expect(parseDuration("3:45")).toBe(225);
    expect(parseDuration("1:05")).toBe(65);
    expect(parseDuration("0:05")).toBe(5);
  });

  it("accepts a single-digit seconds part", () => {
    expect(parseDuration("3:5")).toBe(185);
  });

  it("trims surrounding whitespace", () => {
    expect(parseDuration("  3:45  ")).toBe(225);
  });

  it("returns null for empty or whitespace-only input", () => {
    expect(parseDuration("")).toBeNull();
    expect(parseDuration("   ")).toBeNull();
  });

  it("returns null for a seconds part of 60 or more", () => {
    expect(parseDuration("3:60")).toBeNull();
    expect(parseDuration("3:99")).toBeNull();
  });

  it("returns null for unparsable input", () => {
    expect(parseDuration("abc")).toBeNull();
    expect(parseDuration("3.45")).toBeNull();
    expect(parseDuration("3:45:00")).toBeNull();
    expect(parseDuration(":45")).toBeNull();
  });

  it("round-trips through formatDuration", () => {
    expect(parseDuration(formatDuration(225))).toBe(225);
  });
});

describe("formatTotalDuration", () => {
  it("shows minutes only under an hour", () => {
    expect(formatTotalDuration(42 * 60)).toBe("42 min");
  });

  it("shows hours only on an exact hour boundary", () => {
    expect(formatTotalDuration(60 * 60)).toBe("1 hr");
    expect(formatTotalDuration(2 * 60 * 60)).toBe("2 hr");
  });

  it("shows hours and minutes together", () => {
    expect(formatTotalDuration(60 * 60 + 12 * 60)).toBe("1 hr 12 min");
  });

  it("rounds to the nearest minute", () => {
    expect(formatTotalDuration(41 * 60 + 40)).toBe("42 min");
    expect(formatTotalDuration(41 * 60 + 20)).toBe("41 min");
  });
});
