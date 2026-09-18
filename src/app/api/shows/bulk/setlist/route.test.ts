import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    show: { findMany: vi.fn() },
    setlist: { findUnique: vi.fn() },
    showSetlist: { deleteMany: vi.fn(), create: vi.fn() },
    $transaction: vi.fn()
  }
}));
vi.mock("@/lib/band", () => ({
  canManageEvents: vi.fn(),
  isBandMember: vi.fn()
}));

import { POST } from "@/app/api/shows/bulk/setlist/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageEvents, isBandMember } from "@/lib/band";
import { jsonRequest, makeSession } from "@/test/factories";

const authMock = auth as unknown as Mock;
const showFindManyMock = prisma.show.findMany as unknown as Mock;
const setlistFindUniqueMock = prisma.setlist.findUnique as unknown as Mock;
const transactionMock = prisma.$transaction as unknown as Mock;
const isBandMemberMock = isBandMember as unknown as Mock;
const canManageEventsMock = canManageEvents as unknown as Mock;

const call = (body: unknown) =>
  POST(jsonRequest(body) as Parameters<typeof POST>[0]);

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue(makeSession());
  isBandMemberMock.mockReturnValue(true);
  canManageEventsMock.mockReturnValue(true);
  showFindManyMock.mockResolvedValue([
    { id: "show1", bandId: "band1", createdById: "u1" },
    { id: "show2", bandId: "band1", createdById: "u1" }
  ]);
  transactionMock.mockResolvedValue([]);
});

describe("POST /api/shows/bulk/setlist", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await call({ tourGroupId: "t1", setlistId: "s1" })).status).toBe(401);
  });

  it("400 when tourGroupId or setlistId is missing", async () => {
    expect((await call({ setlistId: "s1" })).status).toBe(400);
    expect((await call({ tourGroupId: "t1" })).status).toBe(400);
  });

  it("404 when the tour group doesn't exist or isn't in the caller's band", async () => {
    showFindManyMock.mockResolvedValue([]);
    expect((await call({ tourGroupId: "t1", setlistId: "s1" })).status).toBe(404);

    showFindManyMock.mockResolvedValue([{ id: "show1", bandId: "band1", createdById: "u1" }]);
    isBandMemberMock.mockReturnValue(false);
    expect((await call({ tourGroupId: "t1", setlistId: "s1" })).status).toBe(404);
  });

  it("403 when the caller can't manage the events", async () => {
    canManageEventsMock.mockReturnValue(false);
    expect((await call({ tourGroupId: "t1", setlistId: "s1" })).status).toBe(403);
  });

  it("400 when the template belongs to a different band", async () => {
    setlistFindUniqueMock.mockResolvedValue({ bandId: "otherBand", songs: [] });
    const res = await call({ tourGroupId: "t1", setlistId: "s1" });
    expect(res.status).toBe(400);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("applies the template to every show in the group", async () => {
    setlistFindUniqueMock.mockResolvedValue({
      bandId: "band1",
      name: "Full Set",
      songs: [{ title: "Opener", position: 0 }]
    });
    const res = await call({ tourGroupId: "t1", setlistId: "s1" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ count: 2 });
    expect(transactionMock).toHaveBeenCalledOnce();
  });
});
