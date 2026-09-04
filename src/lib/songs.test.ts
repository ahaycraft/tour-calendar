import { describe, expect, it } from "vitest";
import {
  SONG_STATUSES,
  isSongStatus,
  resolveTrackEmbed,
  songStatusClass,
  songStatusLabel,
} from "@/lib/songs";

describe("isSongStatus", () => {
  it("accepts every declared status", () => {
    for (const s of SONG_STATUSES) expect(isSongStatus(s)).toBe(true);
  });

  it("rejects unknown values, wrong case and non-strings", () => {
    for (const v of ["idea", "DONE", "", null, undefined, 3, {}]) {
      expect(isSongStatus(v)).toBe(false);
    }
  });
});

describe("song status maps", () => {
  it("has a label and a class for exactly the declared statuses", () => {
    const keys = [...SONG_STATUSES].sort();
    expect(Object.keys(songStatusLabel).sort()).toEqual(keys);
    expect(Object.keys(songStatusClass).sort()).toEqual(keys);
  });
});

describe("resolveTrackEmbed", () => {
  it("returns null for blank input", () => {
    expect(resolveTrackEmbed(null)).toBeNull();
    expect(resolveTrackEmbed(undefined)).toBeNull();
    expect(resolveTrackEmbed("   ")).toBeNull();
  });

  it("returns null for unparseable input or a non-web protocol", () => {
    expect(resolveTrackEmbed("not a url")).toBeNull();
    expect(resolveTrackEmbed("ftp://example.com/x.mp3")).toBeNull();
  });

  it("pulls the src out of a pasted <iframe> snippet", () => {
    expect(
      resolveTrackEmbed('<iframe src="https://samply.app/embed/abc123" allow="autoplay"></iframe>')
    ).toEqual({ kind: "samply", src: "https://samply.app/embed/abc123" });
  });

  it("recognises a Samply embed link", () => {
    expect(resolveTrackEmbed("https://samply.app/embed/xyz")).toEqual({
      kind: "samply",
      src: "https://samply.app/embed/xyz",
    });
  });

  it("matches Samply through a www. host (src keeps the original URL)", () => {
    expect(resolveTrackEmbed("https://www.samply.app/embed/xyz")).toEqual({
      kind: "samply",
      src: "https://www.samply.app/embed/xyz",
    });
  });

  it("treats a non-embed Samply URL as an outbound link", () => {
    expect(resolveTrackEmbed("https://samply.app/s/shareCode")).toEqual({
      kind: "link",
      src: "https://samply.app/s/shareCode",
    });
  });

  it("wraps a SoundCloud track URL in the player embed", () => {
    const out = resolveTrackEmbed("https://soundcloud.com/artist/some-track");
    expect(out?.kind).toBe("soundcloud");
    const u = new URL(out!.src);
    expect(u.origin + u.pathname).toBe("https://w.soundcloud.com/player/");
    expect(u.searchParams.get("url")).toBe(
      "https://soundcloud.com/artist/some-track"
    );
    expect(u.searchParams.get("visual")).toBe("false");
  });

  it("passes an already-built SoundCloud player URL through unchanged", () => {
    const src = "https://w.soundcloud.com/player/?url=https%3A%2F%2Fx";
    expect(resolveTrackEmbed(src)).toEqual({ kind: "soundcloud", src });
  });

  it("detects a direct audio file by extension", () => {
    expect(resolveTrackEmbed("https://cdn.example.com/demos/take3.WAV")).toEqual({
      kind: "audio",
      src: "https://cdn.example.com/demos/take3.WAV",
    });
  });

  it("falls back to a plain link for anything else", () => {
    expect(resolveTrackEmbed("https://example.com/a/page")).toEqual({
      kind: "link",
      src: "https://example.com/a/page",
    });
  });
});
