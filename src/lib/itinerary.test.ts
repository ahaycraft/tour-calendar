import { describe, expect, it } from "vitest";
import { buildItineraryMessage, type ItineraryShow } from "@/lib/itinerary";

function makeShow(overrides: Partial<ItineraryShow> = {}): ItineraryShow {
  return {
    id: "show1",
    type: "SHOW",
    title: "The Roxy",
    date: new Date("2026-09-15T00:00:00Z"),
    venue: "The Roxy Theatre",
    city: "Los Angeles",
    state: "CA",
    country: "US",
    venueAddress: "9009 Sunset Blvd",
    loadInTime: new Date("2026-09-15T21:38:00Z"),
    doorsTime: new Date("2026-09-15T22:38:00Z"),
    setTime: new Date("2026-09-15T23:38:00Z"),
    ...overrides
  };
}

describe("buildItineraryMessage", () => {
  it("includes the title/date, load-in/doors/set, and a link back to the show", () => {
    const msg = buildItineraryMessage(makeShow(), "https://app.example.com");
    const lines = msg.split("\n");

    expect(lines[0]).toBe("The Roxy — Tue, Sep 15, 2026");
    expect(lines[1]).toContain("Load-in");
    expect(lines[1]).toContain("Doors");
    expect(lines[1]).toContain("Set");
    expect(lines[1].split(" · ")).toHaveLength(3);
    expect(msg).toContain("Details: https://app.example.com/shows/show1");
  });

  it("builds a Maps link from the full address", () => {
    const msg = buildItineraryMessage(makeShow(), "https://app.example.com");
    const mapsLine = msg.split("\n").find((l) => l.includes("maps.google.com"));
    expect(mapsLine).toBeDefined();
    // Every address component is folded into the query string.
    const decoded = decodeURIComponent(mapsLine!);
    expect(decoded).toContain("9009 Sunset Blvd");
    expect(decoded).toContain("The Roxy Theatre");
    expect(decoded).toContain("Los Angeles");
    expect(decoded).toContain("CA");
    expect(decoded).toContain("US");
  });

  it("drops the load-in/doors/set line entirely when none are set", () => {
    const msg = buildItineraryMessage(
      makeShow({ loadInTime: null, doorsTime: null, setTime: null }),
      "https://app.example.com"
    );
    expect(msg).not.toContain("Load-in");
    expect(msg).not.toContain("Doors");
    expect(msg).not.toContain("Set");
  });

  it("only lists the times that are actually set", () => {
    const msg = buildItineraryMessage(
      makeShow({ loadInTime: null }),
      "https://app.example.com"
    );
    const timesLine = msg.split("\n")[1];
    expect(timesLine).not.toContain("Load-in");
    expect(timesLine).toContain("Doors");
    expect(timesLine).toContain("Set");
  });

  it("omits the Maps line when there's no venue or address at all", () => {
    const msg = buildItineraryMessage(
      makeShow({
        venue: null,
        city: null,
        state: null,
        country: "",
        venueAddress: null
      }),
      "https://app.example.com"
    );
    expect(msg).not.toContain("maps.google.com");
  });

  it("still links back to the show even with no venue/time details", () => {
    const msg = buildItineraryMessage(
      makeShow({
        venue: null,
        city: null,
        state: null,
        venueAddress: null,
        loadInTime: null,
        doorsTime: null,
        setTime: null
      }),
      "https://app.example.com"
    );
    expect(msg).toContain("Details: https://app.example.com/shows/show1");
  });

  it("uses the right base path for a RECORDING vs a PRACTICE", () => {
    const recording = buildItineraryMessage(
      makeShow({ type: "RECORDING" }),
      "https://app.example.com"
    );
    expect(recording).toContain("Details: https://app.example.com/recordings/show1");

    const practice = buildItineraryMessage(
      makeShow({ type: "PRACTICE" }),
      "https://app.example.com"
    );
    expect(practice).toContain("Details: https://app.example.com/practices/show1");
  });
});
