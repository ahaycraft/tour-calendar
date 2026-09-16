import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn() } }
}));
// Real getActiveBand/userBands read cookies()/headers(), which only work
// inside an actual Next.js request — stub them like the other active-band
// routes' tests do (see songs/route.test.ts) rather than reach for that.
vi.mock("@/lib/band", () => ({
  getActiveBand: vi.fn(),
  userBands: vi.fn((session) => session.user.bands ?? [])
}));

import { GET } from "@/app/api/mobile/me/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getActiveBand } from "@/lib/band";
import { jsonRequest } from "@/test/factories";

const authMock = auth as unknown as Mock;
const findUniqueMock = prisma.user.findUnique as unknown as Mock;
const getActiveBandMock = getActiveBand as unknown as Mock;

const get = () => GET(jsonRequest(undefined) as Parameters<typeof GET>[0]);

beforeEach(() => {
  vi.clearAllMocks();
  findUniqueMock.mockResolvedValue({ phone: "+1 (217) 888-5757" });
  getActiveBandMock.mockImplementation(async (session) => session.user.bands?.[0] ?? null);
});

describe("GET /api/mobile/me", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    const res = await get();
    expect(res.status).toBe(401);
  });

  it("returns the caller's id, name, email, role, phone, and bands", async () => {
    authMock.mockResolvedValue({
      user: {
        id: "u1",
        name: "Jordan Lee",
        email: "jordan@example.com",
        role: "ADMIN",
        bands: [{ id: "band1", name: "The Band", slug: "the-band", role: "OWNER" }]
      }
    });
    const res = await get();
    expect(res.status).toBe(200);
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: "u1" },
      select: { phone: true }
    });
    expect(await res.json()).toEqual({
      id: "u1",
      name: "Jordan Lee",
      email: "jordan@example.com",
      role: "ADMIN",
      phone: "+1 (217) 888-5757",
      bands: [{ id: "band1", name: "The Band", slug: "the-band", role: "OWNER" }],
      activeBandId: "band1"
    });
  });

  it("falls back to null when the user has no phone on file", async () => {
    authMock.mockResolvedValue({
      user: { id: "u1", name: "Jordan Lee", email: "jordan@example.com", role: "ADMIN", bands: [] }
    });
    findUniqueMock.mockResolvedValue({ phone: null });
    const res = await get();
    expect((await res.json()).phone).toBeNull();
  });

  it("returns activeBandId null when the user has no bands", async () => {
    authMock.mockResolvedValue({
      user: { id: "u1", name: "Jordan Lee", email: "jordan@example.com", role: "ADMIN", bands: [] }
    });
    const res = await get();
    expect((await res.json()).activeBandId).toBeNull();
  });
});
