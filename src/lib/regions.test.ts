import { describe, expect, it } from "vitest";
import { normalizeRegion } from "@/lib/regions";

describe("normalizeRegion", () => {
  it("returns an empty string for blank / whitespace input", () => {
    expect(normalizeRegion("", "US")).toBe("");
    expect(normalizeRegion("   ", "US")).toBe("");
    // @ts-expect-error — guarding the runtime null path
    expect(normalizeRegion(null, "US")).toBe("");
  });

  it("upper-cases an existing 2-letter code and ignores the country", () => {
    expect(normalizeRegion("ca", "US")).toBe("CA");
    expect(normalizeRegion("ny", "")).toBe("NY");
    expect(normalizeRegion(" On ", "CA")).toBe("ON");
  });

  it("maps a full US state name to its code when country is US or unset", () => {
    expect(normalizeRegion("California", "US")).toBe("CA");
    expect(normalizeRegion("new york", "US")).toBe("NY");
    expect(normalizeRegion("District of Columbia", "")).toBe("DC");
  });

  it("maps a Canadian province name, including the accented spelling of Quebec", () => {
    expect(normalizeRegion("Ontario", "CA")).toBe("ON");
    expect(normalizeRegion("quebec", "CA")).toBe("QC");
    expect(normalizeRegion("Québec", "CA")).toBe("QC");
  });

  it("does not cross-apply US names when country is CA (and vice versa)", () => {
    // "California" isn't a province, so with country=CA it passes through.
    expect(normalizeRegion("California", "CA")).toBe("California");
    expect(normalizeRegion("Ontario", "US")).toBe("Ontario");
  });

  it("returns an unrecognised name unchanged", () => {
    expect(normalizeRegion("Bavaria", "DE")).toBe("Bavaria");
    expect(normalizeRegion("Some County", "US")).toBe("Some County");
  });
});
