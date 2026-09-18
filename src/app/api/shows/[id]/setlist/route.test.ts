import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    show: { findUnique: vi.fn() },
    setlist: { findUnique: vi.fn() },
    showSetlist: { findUnique: vi.fn(), deleteMany: vi.fn(), create: vi.fn() },
    $transaction: vi.fn()
  }
}));
vi.mock("@/lib/band", () => ({
  canAccessContent: vi.fn(),
  isBandMember: vi.fn()
}));

import { DELETE, GET, POST } from "@/app/api/shows/[id]/setlist/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessContent, isBandMember } from "@/lib/band";
import { jsonRequest, makeSession, routeCtx } from "@/test/factories";

const authMock = auth as unknown as Mock;
const showFindUniqueMock = prisma.show.findUnique as unknown as Mock;
const setlistFindUniqueMock = prisma.setlist.findUnique as unknown as Mock;
const showSetlistFindUniqueMock = prisma.showSetlist.findUnique as unknown as Mock;
const deleteManyMock = prisma.showSetlist.deleteMany as unknown as Mock;
const transactionMock = prisma.$transaction as unknown as Mock;
const isBandMemberMock = isBandMember as unknown as Mock;
const canAccessContentMock = canAccessContent as unknown as Mock;

const get = (id: string) =>
  GET(jsonRequest(undefined) as Parameters<typeof GET>[0], routeCtx(id));
const call = (id: string, body: unknown) =>
  POST(jsonRequest(body) as Parameters<typeof POST>[0], routeCtx(id));
const del = (id: string) =>
  DELETE(jsonRequest(undefined) as Parameters<typeof DELETE>[0], routeCtx(id));

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue(makeSession());
  isBandMemberMock.mockReturnValue(true);
  canAccessContentMock.mockReturnValue(true);
  showFindUniqueMock.mockResolvedValue({ bandId: "band1" });
});

describe("GET /api/shows/[id]/setlist", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await get("show1")).status).toBe(401);
  });

  it("404 when the show doesn't exist or the caller isn't in its band", async () => {
    showFindUniqueMock.mockResolvedValue(null);
    expect((await get("show1")).status).toBe(404);

    showFindUniqueMock.mockResolvedValue({ bandId: "band1" });
    isBandMemberMock.mockReturnValue(false);
    expect((await get("show1")).status).toBe(404);
  });

  it("returns null when the show has no setlist yet", async () => {
    showSetlistFindUniqueMock.mockResolvedValue(null);
    const res = await get("show1");
    expect(res.status).toBe(200);
    expect(await res.json()).toBeNull();
  });

  it("returns the show's setlist with songs", async () => {
    showSetlistFindUniqueMock.mockResolvedValue({
      id: "ss1",
      sourceSetlistName: "Full Set",
      songs: [{ id: "sg1", title: "Opener", position: 0 }]
    });
    const res = await get("show1");
    expect((await res.json()).sourceSetlistName).toBe("Full Set");
  });
});

describe("POST /api/shows/[id]/setlist — apply template", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await call("show1", { setlistId: "s1" })).status).toBe(401);
  });

  it("403 when the caller can't access content", async () => {
    canAccessContentMock.mockReturnValue(false);
    expect((await call("show1", { setlistId: "s1" })).status).toBe(403);
  });

  it("400 when setlistId is missing", async () => {
    expect((await call("show1", {})).status).toBe(400);
  });

  it("400 when the template belongs to a different band", async () => {
    setlistFindUniqueMock.mockResolvedValue({ bandId: "otherBand", songs: [] });
    const res = await call("show1", { setlistId: "s1" });
    expect(res.status).toBe(400);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("copies the template's songs onto the show, replacing any existing setlist", async () => {
    setlistFindUniqueMock.mockResolvedValue({
      bandId: "band1",
      name: "Full Set",
      songs: [
        { title: "Opener", position: 0 },
        { title: "Closer", position: 1 }
      ]
    });
    transactionMock.mockResolvedValue([
      { count: 1 },
      { id: "ss1", sourceSetlistName: "Full Set", songs: [] }
    ]);
    const res = await call("show1", { setlistId: "s1" });
    expect(res.status).toBe(201);
    expect(transactionMock).toHaveBeenCalledOnce();
  });
});

describe("DELETE /api/shows/[id]/setlist", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await del("show1")).status).toBe(401);
  });

  it("403 when the caller can't access content", async () => {
    canAccessContentMock.mockReturnValue(false);
    expect((await del("show1")).status).toBe(403);
    expect(deleteManyMock).not.toHaveBeenCalled();
  });

  it("clears the show's setlist", async () => {
    const res = await del("show1");
    expect(res.status).toBe(200);
    expect(deleteManyMock).toHaveBeenCalledWith({ where: { showId: "show1" } });
  });
});
