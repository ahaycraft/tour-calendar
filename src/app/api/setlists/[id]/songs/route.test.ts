import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    setlist: { findUnique: vi.fn() },
    setlistSong: {
      count: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn()
    },
    $transaction: vi.fn()
  }
}));
vi.mock("@/lib/band", () => ({
  canAccessContent: vi.fn(),
  isBandMember: vi.fn()
}));

import { PATCH, POST } from "@/app/api/setlists/[id]/songs/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessContent, isBandMember } from "@/lib/band";
import { jsonRequest, makeSession, routeCtx } from "@/test/factories";

const authMock = auth as unknown as Mock;
const findUniqueMock = prisma.setlist.findUnique as unknown as Mock;
const countMock = prisma.setlistSong.count as unknown as Mock;
const createMock = prisma.setlistSong.create as unknown as Mock;
const findManyMock = prisma.setlistSong.findMany as unknown as Mock;
const transactionMock = prisma.$transaction as unknown as Mock;
const isBandMemberMock = isBandMember as unknown as Mock;
const canAccessContentMock = canAccessContent as unknown as Mock;

const call = (id: string, body: unknown) =>
  POST(jsonRequest(body) as Parameters<typeof POST>[0], routeCtx(id));
const reorder = (id: string, body: unknown) =>
  PATCH(jsonRequest(body) as Parameters<typeof PATCH>[0], routeCtx(id));

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue(makeSession());
  isBandMemberMock.mockReturnValue(true);
  canAccessContentMock.mockReturnValue(true);
  findUniqueMock.mockResolvedValue({ bandId: "band1" });
  transactionMock.mockResolvedValue([]);
});

describe("POST /api/setlists/[id]/songs", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await call("s1", { title: "Opener" })).status).toBe(401);
  });

  it("404 when out-of-band, 403 when forbidden", async () => {
    findUniqueMock.mockResolvedValue(null);
    expect((await call("s1", { title: "Opener" })).status).toBe(404);

    findUniqueMock.mockResolvedValue({ bandId: "band1" });
    canAccessContentMock.mockReturnValue(false);
    expect((await call("s1", { title: "Opener" })).status).toBe(403);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("400 for a blank title", async () => {
    expect((await call("s1", { title: "  " })).status).toBe(400);
  });

  it("appends the song at the next position", async () => {
    countMock.mockResolvedValue(3);
    createMock.mockResolvedValue({ id: "sg1", title: "Encore", position: 3 });
    const res = await call("s1", { title: "  Encore  " });
    expect(res.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith({
      data: { setlistId: "s1", title: "Encore", position: 3 }
    });
  });
});

describe("PATCH /api/setlists/[id]/songs — reorder", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await reorder("s1", { songIds: ["a", "b"] })).status).toBe(401);
  });

  it("400 when songIds isn't a list of strings", async () => {
    expect((await reorder("s1", { songIds: "a" })).status).toBe(400);
    expect((await reorder("s1", { songIds: [1, 2] })).status).toBe(400);
  });

  it("updates positions to match the given order", async () => {
    findManyMock.mockResolvedValue([
      { id: "b", position: 0 },
      { id: "a", position: 1 }
    ]);
    const res = await reorder("s1", { songIds: ["b", "a"] });
    expect(res.status).toBe(200);
    expect(transactionMock).toHaveBeenCalledOnce();
  });
});
