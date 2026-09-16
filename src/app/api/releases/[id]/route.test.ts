import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { release: { findUnique: vi.fn() } }
}));
vi.mock("@/lib/band", () => ({
  canManage: vi.fn(),
  isBandMember: vi.fn()
}));

import { GET } from "@/app/api/releases/[id]/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isBandMember } from "@/lib/band";
import { jsonRequest, makeSession, routeCtx } from "@/test/factories";

const authMock = auth as unknown as Mock;
const findUniqueMock = prisma.release.findUnique as unknown as Mock;
const isBandMemberMock = vi.mocked(isBandMember);

const get = (id: string) =>
  GET(jsonRequest(undefined) as Parameters<typeof GET>[0], routeCtx(id));

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue(makeSession());
  isBandMemberMock.mockReturnValue(true);
});

describe("GET /api/releases/[id]", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await get("r1")).status).toBe(401);
  });

  it("404 when the release doesn't exist or the caller isn't in its band", async () => {
    findUniqueMock.mockResolvedValue(null);
    expect((await get("r1")).status).toBe(404);

    findUniqueMock.mockResolvedValue({ bandId: "band1" });
    isBandMemberMock.mockReturnValue(false);
    expect((await get("r1")).status).toBe(404);
  });

  it("returns the release when found and the caller is a band member", async () => {
    findUniqueMock.mockResolvedValue({ id: "r1", bandId: "band1", tracks: [] });
    const res = await get("r1");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: "r1" });
  });
});
