import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { setlist: { findMany: vi.fn(), create: vi.fn() } }
}));
vi.mock("@/lib/band", () => ({
  canAccessContent: vi.fn(),
  isBandMember: vi.fn()
}));

import { GET, POST } from "@/app/api/bands/[id]/setlists/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessContent, isBandMember } from "@/lib/band";
import { jsonRequest, makeSession, routeCtx } from "@/test/factories";

const authMock = auth as unknown as Mock;
const findManyMock = prisma.setlist.findMany as unknown as Mock;
const createMock = prisma.setlist.create as unknown as Mock;
const isBandMemberMock = isBandMember as unknown as Mock;
const canAccessContentMock = canAccessContent as unknown as Mock;

const list = (id: string) =>
  GET(jsonRequest(undefined) as Parameters<typeof GET>[0], routeCtx(id));
const call = (id: string, body: unknown) =>
  POST(jsonRequest(body) as Parameters<typeof POST>[0], routeCtx(id));

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue(makeSession());
  isBandMemberMock.mockReturnValue(true);
  canAccessContentMock.mockReturnValue(true);
});

describe("GET /api/bands/[id]/setlists", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await list("band1")).status).toBe(401);
  });

  it("404 when the caller isn't a band member", async () => {
    isBandMemberMock.mockReturnValue(false);
    expect((await list("band1")).status).toBe(404);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("returns the band's templates", async () => {
    findManyMock.mockResolvedValue([{ id: "s1", name: "Full Set", _count: { songs: 12 } }]);
    const res = await list("band1");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: "s1", name: "Full Set", _count: { songs: 12 } }]);
  });
});

describe("POST /api/bands/[id]/setlists", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await call("band1", { name: "Full Set" })).status).toBe(401);
  });

  it("403 when the caller can't access content", async () => {
    canAccessContentMock.mockReturnValue(false);
    expect((await call("band1", { name: "Full Set" })).status).toBe(403);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("400 for a blank name", async () => {
    expect((await call("band1", { name: "  " })).status).toBe(400);
  });

  it("creates a trimmed template", async () => {
    createMock.mockResolvedValue({ id: "s1", name: "Full Set" });
    const res = await call("band1", { name: "  Full Set  " });
    expect(res.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: { bandId: "band1", name: "Full Set" } })
    );
  });
});
