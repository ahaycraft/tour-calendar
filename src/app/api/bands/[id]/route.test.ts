import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    band: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() }
  }
}));
vi.mock("@/lib/band", () => ({
  ACTIVE_BAND_COOKIE: "active_band",
  bandRole: vi.fn(),
  isBandMember: vi.fn()
}));

import { DELETE, GET, PATCH } from "@/app/api/bands/[id]/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { bandRole, isBandMember } from "@/lib/band";
import { jsonRequest, makeSession, routeCtx } from "@/test/factories";

const authMock = auth as unknown as Mock;
const findUniqueMock = prisma.band.findUnique as unknown as Mock;
const updateMock = prisma.band.update as unknown as Mock;
const deleteMock = prisma.band.delete as unknown as Mock;
const bandRoleMock = bandRole as unknown as Mock;
const isBandMemberMock = isBandMember as unknown as Mock;

const get = (id: string) =>
  GET(jsonRequest(undefined) as Parameters<typeof GET>[0], routeCtx(id));
const patch = (id: string, body: unknown) =>
  PATCH(jsonRequest(body) as Parameters<typeof PATCH>[0], routeCtx(id));
const del = (id: string) =>
  DELETE(jsonRequest(undefined) as Parameters<typeof DELETE>[0], routeCtx(id));

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue(makeSession());
});

describe("GET /api/bands/[id]", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await get("band1")).status).toBe(401);
  });

  it("404 when the caller isn't a member of the band", async () => {
    isBandMemberMock.mockReturnValue(false);
    expect((await get("band1")).status).toBe(404);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("returns the band's rider for any member, not just owner/admin", async () => {
    isBandMemberMock.mockReturnValue(true);
    findUniqueMock.mockResolvedValue({
      id: "band1",
      name: "The Band",
      rider: "2 mics, backline provided"
    } as never);
    const res = await get("band1");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      id: "band1",
      name: "The Band",
      rider: "2 mics, backline provided"
    });
  });
});

describe("PATCH /api/bands/[id]", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await patch("band1", { name: "x" })).status).toBe(401);
  });

  it("403 when the caller isn't an owner/admin", async () => {
    bandRoleMock.mockReturnValue("MEMBER");
    expect((await patch("band1", { rider: "x" })).status).toBe(403);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("400 for an empty name", async () => {
    bandRoleMock.mockReturnValue("OWNER");
    expect((await patch("band1", { name: "   " })).status).toBe(400);
  });

  it("updates the rider without requiring a name", async () => {
    bandRoleMock.mockReturnValue("ADMIN");
    updateMock.mockResolvedValue({
      id: "band1",
      name: "The Band",
      rider: "New rider text"
    } as never);
    const res = await patch("band1", { rider: "New rider text" });
    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "band1" },
      data: { rider: "New rider text" },
      select: { id: true, name: true, rider: true }
    });
  });

  it("clears the rider when saved as an empty string", async () => {
    bandRoleMock.mockReturnValue("OWNER");
    updateMock.mockResolvedValue({} as never);
    await patch("band1", { rider: "   " });
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: { rider: null } })
    );
  });
});

describe("DELETE /api/bands/[id]", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await del("band1")).status).toBe(401);
  });

  it("403 when the caller isn't an owner", async () => {
    bandRoleMock.mockReturnValue("ADMIN");
    expect((await del("band1")).status).toBe(403);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("deletes the band when the caller is an owner", async () => {
    bandRoleMock.mockReturnValue("OWNER");
    const res = await del("band1");
    expect(res.status).toBe(200);
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "band1" } });
  });
});
