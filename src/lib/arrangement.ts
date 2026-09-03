/**
 * Song arrangement helpers — the shared vocabulary the SongArrangement editor
 * uses on both the song page and the release tracking plan.
 */

/** Quick-add chips, in the order a song usually runs. */
export const SECTION_PRESETS = [
  "Intro",
  "Verse",
  "Pre-Chorus",
  "Chorus",
  "Post-Chorus",
  "Bridge",
  "Solo",
  "Instrumental",
  "Breakdown",
  "Outro",
] as const;

export const MAX_SECTION_NAME = 80;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Work out what a preset chip should do given the sections already present.
 * The first "Verse" is added bare; the second promotes the bare one to
 * "Verse 1" and itself becomes "Verse 2", and it climbs from there.
 *
 * Returns the name for the new section and, when a bare section needs
 * promoting, its id and new name.
 */
export function planPresetAdd(
  preset: string,
  sections: { id: string; name: string }[]
): { name: string; promote?: { id: string; name: string } } {
  const matcher = new RegExp(`^${escapeRegExp(preset)}(?:\\s+(\\d+))?$`, "i");
  const matches = sections.filter((s) => matcher.test(s.name.trim()));

  if (matches.length === 0) return { name: preset };

  const name = `${preset} ${matches.length + 1}`;
  const bare = matches.find(
    (s) => s.name.trim().toLowerCase() === preset.toLowerCase()
  );
  return bare
    ? { name, promote: { id: bare.id, name: `${preset} 1` } }
    : { name };
}

/**
 * A muted accent class for a section row, keyed off its leading word so custom
 * names still land somewhere sensible. Uses the shared badge palette.
 */
export function sectionAccent(name: string): string {
  const head = name.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  switch (head) {
    case "verse":
      return "badge-denim";
    case "chorus":
    case "post-chorus":
      return "badge-moss";
    case "pre-chorus":
      return "badge-teal";
    case "bridge":
      return "badge-mauve";
    case "solo":
    case "instrumental":
    case "breakdown":
      return "badge-ochre";
    default:
      return "bg-zinc-700 text-zinc-300";
  }
}
