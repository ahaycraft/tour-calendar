export const RELEASE_KINDS = ["ALBUM", "EP", "SINGLE", "GROUP"] as const;
export type ReleaseKind = (typeof RELEASE_KINDS)[number];

export const releaseKindLabel: Record<ReleaseKind, string> = {
  ALBUM: "Album",
  EP: "EP",
  SINGLE: "Single",
  GROUP: "Group",
};

export const RELEASE_STATUSES = [
  "PLANNING",
  "WRITING",
  "TRACKING",
  "MIXING",
  "RELEASED",
] as const;
export type ReleaseStatus = (typeof RELEASE_STATUSES)[number];

export const releaseStatusLabel: Record<ReleaseStatus, string> = {
  PLANNING: "Planning",
  WRITING: "Writing",
  TRACKING: "Tracking",
  MIXING: "Mixing",
  RELEASED: "Released",
};

// Muted status palette shared with the calendar and show badges (see the
// --badge-* tokens / .badge-* classes in globals.css).
export const releaseStatusClass: Record<ReleaseStatus, string> = {
  PLANNING: "bg-zinc-700 text-zinc-300",
  WRITING: "badge-denim",
  TRACKING: "badge-ochre",
  MIXING: "badge-mauve",
  RELEASED: "badge-moss",
};

export function isReleaseKind(v: unknown): v is ReleaseKind {
  return typeof v === "string" && (RELEASE_KINDS as readonly string[]).includes(v);
}
export function isReleaseStatus(v: unknown): v is ReleaseStatus {
  return typeof v === "string" && (RELEASE_STATUSES as readonly string[]).includes(v);
}
