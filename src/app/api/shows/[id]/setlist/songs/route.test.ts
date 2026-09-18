import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    show: { findUnique: vi.fn() },
    showSetlist: { upsert: vi.fn(), findUnique: vi.fn() },
    showSetlistSong: {
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

import { PATCH, POST } from "@/app/api/shows/[id]/setlist/songs/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessContent, isBandMember } from "@/lib/band";
import { jsonRequest, makeSession, routeCtx } from "@/test/factories";

const authMock = auth as unknown as Mock;
const showFindUniqueMock = prisma.show.findUnique as unknown as Mock;
const upsertMock = prisma.showSetlist.upsert as unknown as Mock;
const showSetlistFindUniqueMock = prisma.showSetlist.findUnique as unknown as Mock;
const countMock = prisma.showSetlistSong.count as unknown as Mock;
const createMock = prisma.showSetlistSong.create as unknown as Mock;
const findManyMock = prisma.showSetlistSong.findMany as unknown as Mock;
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
  showFindUniqueMock.mockResolvedValue({ bandId: "band1" });
  transactionMock.mockResolvedValue([]);
});

describe("POST /api/shows/[id]/setlist/songs", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await call("show1", { title: "Encore" })).status).toBe(401);
  });

  it("403 when the caller can't access content", async () => {
    canAccessContentMock.mockReturnValue(false);
    expect((await call("show1", { title: "Encore" })).status).toBe(403);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("400 for a blank title", async () => {
    expect((await call("show1", { title: "" })).status).toBe(400);
  });

  it("auto-creates an empty ShowSetlist and appends the song", async () => {
    upsertMock.mockResolvedValue({ id: "ss1" });
    countMock.mockResolvedValue(0);
    createMock.mockResolvedValue({ id: "sg1", title: "Encore", position: 0 });
    const res = await call("show1", { title: "Encore" });
    expect(res.status).toBe(201);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { showId: "show1" } })
    );
    expect(createMock).toHaveBeenCalledWith({
      data: { showSetlistId: "ss1", title: "Encore", position: 0 }
    });
  });
});

describe("PATCH /api/shows/[id]/setlist/songs — reorder", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await reorder("show1", { songIds: ["a"] })).status).toBe(401);
  });

  it("404 when the show has no setlist yet", async () => {
    showSetlistFindUniqueMock.mockResolvedValue(null);
    const res = await reorder("show1", { songIds: ["a"] });
    expect(res.status).toBe(404);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("400 when songIds isn't a list of strings", async () => {
    showSetlistFindUniqueMock.mockResolvedValue({ id: "ss1" });
    expect((await reorder("show1", { songIds: [1] })).status).toBe(400);
  });

  it("updates positions to match the given order", async () => {
    showSetlistFindUniqueMock.mockResolvedValue({ id: "ss1" });
    findManyMock.mockResolvedValue([{ id: "b", position: 0 }]);
    const res = await reorder("show1", { songIds: ["b", "a"] });
    expect(res.status).toBe(200);
    expect(transactionMock).toHaveBeenCalledOnce();
  });
});
