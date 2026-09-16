import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { song: { findMany: vi.fn() } }
}));
vi.mock("@/lib/band", () => ({ getActiveBandId: vi.fn() }));

import { GET } from "@/app/api/songs/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getActiveBandId } from "@/lib/band";
import { jsonRequest, makeSession } from "@/test/factories";

const authMock = auth as unknown as Mock;
const findManyMock = prisma.song.findMany as unknown as Mock;
const getActiveBandIdMock = vi.mocked(getActiveBandId);

const list = () => GET(jsonRequest(undefined) as Parameters<typeof GET>[0]);

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue(makeSession());
  getActiveBandIdMock.mockResolvedValue("band1");
});

describe("GET /api/songs", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await list()).status).toBe(401);
  });

  it("returns an empty list when the caller has no active band", async () => {
    getActiveBandIdMock.mockResolvedValue(null);
    const res = await list();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("scopes the query to the active band", async () => {
    findManyMock.mockResolvedValue([]);
    const res = await list();
    expect(res.status).toBe(200);
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { bandId: "band1" } })
    );
  });
});
