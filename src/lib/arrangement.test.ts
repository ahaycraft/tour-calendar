import { describe, expect, it } from "vitest";
import { planPresetAdd, sectionAccent } from "@/lib/arrangement";

const s = (name: string, id = name) => ({ id, name });

describe("planPresetAdd", () => {
  it("adds the preset bare when none like it exist", () => {
    expect(planPresetAdd("Verse", [])).toEqual({ name: "Verse" });
    expect(planPresetAdd("Chorus", [s("Verse")])).toEqual({ name: "Chorus" });
  });

  it("promotes the lone bare section to '<preset> 1' and numbers the new one 2", () => {
    expect(planPresetAdd("Verse", [s("Verse", "v1")])).toEqual({
      name: "Verse 2",
      promote: { id: "v1", name: "Verse 1" },
    });
  });

  it("keeps climbing without promoting once sections are already numbered", () => {
    expect(
      planPresetAdd("Verse", [s("Verse 1", "v1"), s("Verse 2", "v2")])
    ).toEqual({ name: "Verse 3" });
  });

  it("matches case-insensitively and against untrimmed stored names", () => {
    expect(planPresetAdd("Verse", [s("  verse ", "v1")])).toEqual({
      name: "Verse 2",
      promote: { id: "v1", name: "Verse 1" },
    });
  });

  it("treats a hyphenated preset name literally", () => {
    expect(planPresetAdd("Pre-Chorus", [s("Pre-Chorus", "p1")])).toEqual({
      name: "Pre-Chorus 2",
      promote: { id: "p1", name: "Pre-Chorus 1" },
    });
  });

  it("does not match a different preset that shares a prefix", () => {
    // "Verse" must not match "Verse Reprise" (extra word, not a number).
    expect(planPresetAdd("Verse", [s("Verse Reprise")])).toEqual({
      name: "Verse",
    });
  });
});

describe("sectionAccent", () => {
  it.each([
    ["Verse 2", "badge-denim"],
    ["Chorus", "badge-moss"],
    ["Post-Chorus", "badge-moss"],
    ["Pre-Chorus", "badge-teal"],
    ["Bridge", "badge-mauve"],
    ["Solo", "badge-ochre"],
    ["Instrumental", "badge-ochre"],
    ["Breakdown", "badge-ochre"],
  ])("keys off the leading word: %s", (name, cls) => {
    expect(sectionAccent(name)).toBe(cls);
  });

  it("falls back to a neutral class for intros, outros and custom names", () => {
    expect(sectionAccent("Intro")).toBe("bg-zinc-700 text-zinc-300");
    expect(sectionAccent("Guitar freakout")).toBe("bg-zinc-700 text-zinc-300");
    expect(sectionAccent("")).toBe("bg-zinc-700 text-zinc-300");
  });
});
