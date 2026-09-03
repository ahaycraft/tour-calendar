import { prisma } from "@/lib/prisma";

/** The set every band starts with; they rename / add / archive from here. */
export const DEFAULT_INSTRUMENTS = [
  "Drums",
  "Bass",
  "Rhythm Guitar",
  "Lead Guitar",
  "Vocals",
  "Backing Vocals",
] as const;

/**
 * Give a band its default instrument library if it has none yet. Idempotent —
 * safe to call on every tracking-plan page load and on band creation.
 */
export async function ensureBandInstruments(bandId: string): Promise<void> {
  const count = await prisma.instrument.count({ where: { bandId } });
  if (count > 0) return;
  await prisma.instrument.createMany({
    data: DEFAULT_INSTRUMENTS.map((name, i) => ({ bandId, name, sortOrder: i })),
    skipDuplicates: true,
  });
}

export const RECORDING_PART_STATUSES = [
  "TODO",
  "TRACKING",
  "TRACKED",
  "NEEDS_REDO",
] as const;

export type RecordingPartStatus = (typeof RECORDING_PART_STATUSES)[number];

export const recordingPartStatusLabel: Record<RecordingPartStatus, string> = {
  TODO: "To do",
  TRACKING: "Tracking",
  TRACKED: "Tracked",
  NEEDS_REDO: "Needs redo",
};

// Muted status palette shared with the calendar and show badges (see the
// --badge-* tokens / .badge-* classes in globals.css).
export const recordingPartStatusClass: Record<RecordingPartStatus, string> = {
  TODO: "bg-zinc-700 text-zinc-300",
  TRACKING: "badge-ochre",
  TRACKED: "badge-moss",
  NEEDS_REDO: "badge-brick",
};

export function isRecordingPartStatus(v: unknown): v is RecordingPartStatus {
  return (
    typeof v === "string" &&
    (RECORDING_PART_STATUSES as readonly string[]).includes(v)
  );
}

/** A part counts as done for progress purposes only when fully tracked. */
export function isPartDone(status: string): boolean {
  return status === "TRACKED";
}
