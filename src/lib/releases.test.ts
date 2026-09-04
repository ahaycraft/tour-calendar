import { describe, expect, it } from "vitest";
import {
  RELEASE_KINDS,
  RELEASE_STATUSES,
  isReleaseKind,
  isReleaseStatus,
  releaseKindLabel,
  releaseStatusClass,
  releaseStatusLabel,
} from "@/lib/releases";

describe("release guards", () => {
  it("isReleaseKind accepts declared kinds only", () => {
    for (const k of RELEASE_KINDS) expect(isReleaseKind(k)).toBe(true);
    for (const v of ["album", "LP", "", null, 1]) {
      expect(isReleaseKind(v)).toBe(false);
    }
  });

  it("isReleaseStatus accepts declared statuses only", () => {
    for (const s of RELEASE_STATUSES) expect(isReleaseStatus(s)).toBe(true);
    for (const v of ["planning", "DONE", "", undefined, {}]) {
      expect(isReleaseStatus(v)).toBe(false);
    }
  });
});

describe("release maps", () => {
  it("labels every kind", () => {
    expect(Object.keys(releaseKindLabel).sort()).toEqual([...RELEASE_KINDS].sort());
  });

  it("labels and classes every status", () => {
    const keys = [...RELEASE_STATUSES].sort();
    expect(Object.keys(releaseStatusLabel).sort()).toEqual(keys);
    expect(Object.keys(releaseStatusClass).sort()).toEqual(keys);
  });
});
