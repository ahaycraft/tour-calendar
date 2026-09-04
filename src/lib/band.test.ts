import { describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";

// band.ts pulls these in at module load; the pure helpers under test never
// call them, so empty stubs are enough to let the import resolve.
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { bandRole, canManage, isBandMember, userBands } from "@/lib/band";

type Role = "OWNER" | "ADMIN" | "MEMBER";

function session(
  userId: string,
  bands: { id: string; role: Role }[]
): Session {
  return {
    user: {
      id: userId,
      bands: bands.map((b) => ({
        id: b.id,
        name: b.id,
        slug: b.id,
        role: b.role,
      })),
    },
  } as unknown as Session;
}

const owner = session("u1", [{ id: "b1", role: "OWNER" }]);
const admin = session("u2", [{ id: "b1", role: "ADMIN" }]);
const member = session("u3", [{ id: "b1", role: "MEMBER" }]);
const outsider = session("u4", [{ id: "b2", role: "OWNER" }]);

describe("userBands", () => {
  it("returns the session's bands", () => {
    expect(userBands(member).map((b) => b.id)).toEqual(["b1"]);
  });

  it("returns [] when the user has no bands array", () => {
    expect(userBands({ user: { id: "x" } } as unknown as Session)).toEqual([]);
  });
});

describe("isBandMember", () => {
  it("is true only when the band is in the user's list", () => {
    expect(isBandMember(member, "b1")).toBe(true);
    expect(isBandMember(outsider, "b1")).toBe(false);
  });

  it("is false for a null or undefined bandId", () => {
    expect(isBandMember(member, null)).toBe(false);
    expect(isBandMember(member, undefined)).toBe(false);
  });
});

describe("bandRole", () => {
  it("returns the user's role in that band", () => {
    expect(bandRole(owner, "b1")).toBe("OWNER");
    expect(bandRole(member, "b1")).toBe("MEMBER");
  });

  it("returns null when the user isn't in the band or bandId is missing", () => {
    expect(bandRole(outsider, "b1")).toBeNull();
    expect(bandRole(member, null)).toBeNull();
  });
});

describe("canManage", () => {
  it("lets owners and admins of the band manage", () => {
    expect(canManage(owner, "b1")).toBe(true);
    expect(canManage(admin, "b1")).toBe(true);
  });

  it("does not let a plain member manage a record they didn't create", () => {
    expect(canManage(member, "b1", "someone-else")).toBe(false);
    expect(canManage(member, "b1")).toBe(false);
  });

  it("lets the record's creator manage regardless of role", () => {
    expect(canManage(member, "b1", "u3")).toBe(true);
  });

  it("still honours creator-match even when the band role can't be resolved", () => {
    expect(canManage(outsider, "b1", "u4")).toBe(true);
    expect(canManage(outsider, null, "u4")).toBe(true);
    expect(canManage(outsider, null, "someone-else")).toBe(false);
  });
});
