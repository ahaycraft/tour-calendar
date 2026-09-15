import { describe, expect, it } from "vitest";
import { matchesQuery } from "@/lib/search";

describe("matchesQuery", () => {
  it("matches everything when the query is empty or whitespace", () => {
    expect(matchesQuery("", ["Radio City"])).toBe(true);
    expect(matchesQuery("   ", ["Radio City"])).toBe(true);
  });

  it("matches a substring in any field, case-insensitively", () => {
    expect(matchesQuery("radio", ["Radio City Music Hall", null])).toBe(true);
    expect(matchesQuery("CITY", ["Radio City Music Hall"])).toBe(true);
  });

  it("ignores null/undefined fields", () => {
    expect(matchesQuery("chicago", [null, undefined, "Chicago"])).toBe(true);
  });

  it("returns false when no field matches", () => {
    expect(
      matchesQuery("brooklyn", ["Radio City", "Manhattan", null, undefined])
    ).toBe(false);
  });
});
