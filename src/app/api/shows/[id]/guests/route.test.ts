import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { show: { findUnique: vi.fn() }, $queryRaw: vi.fn() }
}));
vi.mock("@/lib/band", () => ({ isBandMember: vi.fn() }));

import { POST } from "@/app/api/shows/[id]/guests/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isBandMember } from "@/lib/band";
import { jsonRequest, makeSession, routeCtx } from "@/test/factories";

const authMock = auth as unknown as Mock;
const findUniqueMock = prisma.show.findUnique as unknown as Mock;
const queryRawMock = prisma.$queryRaw as unknown as Mock;
const isBandMemberMock = isBandMember as unknown as Mock;

const call = (id: string, body: unknown) =>
  POST(jsonRequest(body) as Parameters<typeof POST>[0], routeCtx(id));

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue(makeSession());
  findUniqueMock.mockResolvedValue({ bandId: "band1" });
  isBandMemberMock.mockReturnValue(true);
});

describe("POST /api/shows/[id]/guests", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await call("show1", { names: "Jane Smith" })).status).toBe(401);
  });

  it("404 when the show doesn't exist or the caller isn't in its band", async () => {
    findUniqueMock.mockResolvedValue(null);
    expect((await call("show1", { names: "Jane Smith" })).status).toBe(404);

    findUniqueMock.mockResolvedValue({ bandId: "band1" });
    isBandMemberMock.mockReturnValue(false);
    expect((await call("show1", { names: "Jane Smith" })).status).toBe(404);
    expect(queryRawMock).not.toHaveBeenCalled();
  });

  it("400 for a blank or missing name", async () => {
    expect((await call("show1", { names: "   " })).status).toBe(400);
    expect((await call("show1", {})).status).toBe(400);
    expect(queryRawMock).not.toHaveBeenCalled();
  });

  it("appends the trimmed names and returns the updated list", async () => {
    queryRawMock.mockResolvedValue([
      { guestList: "Jane Smith\nJohn Doe" }
    ]);
    const res = await call("show1", { names: "  John Doe  " });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ guestList: "Jane Smith\nJohn Doe" });
    expect(queryRawMock).toHaveBeenCalledOnce();
  });

  it("500s if the update throws, without surfacing internals", async () => {
    queryRawMock.mockRejectedValue(new Error("db down"));
    const res = await call("show1", { names: "Jane Smith" });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal server error" });
  });
});
