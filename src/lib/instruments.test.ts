import { describe, expect, it } from "vitest";
import {
  RECORDING_PART_STATUSES,
  isPartDone,
  isRecordingPartStatus,
  recordingPartStatusClass,
  recordingPartStatusLabel,
} from "@/lib/instruments";

describe("isRecordingPartStatus", () => {
  it("accepts declared statuses only", () => {
    for (const s of RECORDING_PART_STATUSES) {
      expect(isRecordingPartStatus(s)).toBe(true);
    }
    for (const v of ["todo", "DONE", "", null, 0]) {
      expect(isRecordingPartStatus(v)).toBe(false);
    }
  });
});

describe("isPartDone", () => {
  it("is done only when fully TRACKED", () => {
    expect(isPartDone("TRACKED")).toBe(true);
    for (const s of ["TODO", "TRACKING", "NEEDS_REDO", "anything"]) {
      expect(isPartDone(s)).toBe(false);
    }
  });
});

describe("recording-part maps", () => {
  it("label and class every declared status", () => {
    const keys = [...RECORDING_PART_STATUSES].sort();
    expect(Object.keys(recordingPartStatusLabel).sort()).toEqual(keys);
    expect(Object.keys(recordingPartStatusClass).sort()).toEqual(keys);
  });
});
