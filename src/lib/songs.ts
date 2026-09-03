export const SONG_STATUSES = [
  "IDEA",
  "WRITING",
  "DEMO",
  "READY_TO_TRACK",
  "TRACKED",
  "RELEASED",
] as const;

export type SongStatus = (typeof SONG_STATUSES)[number];

export const songStatusLabel: Record<SongStatus, string> = {
  IDEA: "Idea",
  WRITING: "Writing",
  DEMO: "Demo",
  READY_TO_TRACK: "Ready to track",
  TRACKED: "Tracked",
  RELEASED: "Released",
};

// Muted status palette shared with the calendar and show badges (see the
// --badge-* tokens / .badge-* classes in globals.css).
export const songStatusClass: Record<SongStatus, string> = {
  IDEA: "bg-zinc-700 text-zinc-300",
  WRITING: "badge-denim",
  DEMO: "badge-mauve",
  READY_TO_TRACK: "badge-ochre",
  TRACKED: "badge-moss",
  RELEASED: "badge-teal",
};

export function isSongStatus(v: unknown): v is SongStatus {
  return typeof v === "string" && (SONG_STATUSES as readonly string[]).includes(v);
}

export type TrackEmbed =
  | { kind: "samply"; src: string }
  | { kind: "soundcloud"; src: string }
  | { kind: "audio"; src: string }
  | { kind: "link"; src: string }
  | null;

/**
 * Turn whatever a writer pastes — a Samply embed URL, a full <iframe> snippet,
 * a SoundCloud track link, a direct audio file, or anything else — into
 * something the song page can render.
 */
export function resolveTrackEmbed(raw: string | null | undefined): TrackEmbed {
  const input = (raw ?? "").trim();
  if (!input) return null;

  // Someone pasted the whole "Copy embed" snippet.
  const iframeSrc = input.match(/<iframe[^>]+src=["']([^"']+)["']/i)?.[1];
  const value = iframeSrc ?? input;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.replace(/^www\./, "");

  if (host === "samply.app" && url.pathname.startsWith("/embed/")) {
    return { kind: "samply", src: url.toString() };
  }
  if (host === "samply.app") {
    // A share link, not an embed link — send them out to it.
    return { kind: "link", src: url.toString() };
  }

  if (host === "soundcloud.com" || host === "on.soundcloud.com") {
    const player = new URL("https://w.soundcloud.com/player/");
    player.searchParams.set("url", url.toString());
    player.searchParams.set("color", "#3b82f6");
    player.searchParams.set("visual", "false");
    return { kind: "soundcloud", src: player.toString() };
  }
  if (host === "w.soundcloud.com") {
    return { kind: "soundcloud", src: url.toString() };
  }

  if (/\.(mp3|wav|m4a|aac|ogg|oga|flac)$/i.test(url.pathname)) {
    return { kind: "audio", src: url.toString() };
  }

  return { kind: "link", src: url.toString() };
}
