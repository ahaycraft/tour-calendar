import { describe, expect, it } from "vitest";
import { paginate } from "@/lib/pagination";

describe("paginate", () => {
  const items = Array.from({ length: 25 }, (_, i) => i + 1);

  it("slices the requested page", () => {
    expect(paginate(items, 1, 10).pageItems).toEqual(items.slice(0, 10));
    expect(paginate(items, 2, 10).pageItems).toEqual(items.slice(10, 20));
    expect(paginate(items, 3, 10).pageItems).toEqual(items.slice(20, 25));
  });

  it("reports total pages", () => {
    expect(paginate(items, 1, 10).totalPages).toBe(3);
  });

  it("clamps a page below 1 up to 1", () => {
    expect(paginate(items, 0, 10).page).toBe(1);
    expect(paginate(items, -5, 10).page).toBe(1);
  });

  it("clamps a page past the end down to the last page", () => {
    expect(paginate(items, 99, 10).page).toBe(3);
    expect(paginate(items, 99, 10).pageItems).toEqual(items.slice(20, 25));
  });

  it("always returns at least one page, even for an empty list", () => {
    const result = paginate([], 1, 10);
    expect(result.totalPages).toBe(1);
    expect(result.pageItems).toEqual([]);
  });

  it("defaults to DEFAULT_PAGE_SIZE when no pageSize is given", () => {
    expect(paginate(items, 1).pageItems).toHaveLength(10);
  });
});
