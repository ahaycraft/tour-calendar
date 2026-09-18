import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    setlist: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() }
  }
}));
vi.mock("@/lib/band", () => ({
  canAccessContent: vi.fn(),
  isBandMember: vi.fn()
}));

import { DELETE, GET, PATCH } from "@/app/api/setlists/[id]/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessContent, isBandMember } from "@/lib/band";
import { jsonRequest, makeSession, routeCtx } from "@/test/factories";

const authMock = auth as unknown as Mock;
const findUniqueMock = prisma.setlist.findUnique as unknown as Mock;
const updateMock = prisma.setlist.update as unknown as Mock;
const deleteMock = prisma.setlist.delete as unknown as Mock;
const isBandMemberMock = isBandMember as unknown as Mock;
const canAccessContentMock = canAccessContent as unknown as Mock;

const get = (id: string) =>
  GET(jsonRequest(undefined) as Parameters<typeof GET>[0], routeCtx(id));
const patch = (id: string, body: unknown) =>
  PATCH(jsonRequest(body) as Parameters<typeof PATCH>[0], routeCtx(id));
const del = (id: string) =>
  DELETE(jsonRequest(undefined) as Parameters<typeof DELETE>[0], routeCtx(id));

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue(makeSession());
  isBandMemberMock.mockReturnValue(true);
  canAccessContentMock.mockReturnValue(true);
});

describe("GET /api/setlists/[id]", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await get("s1")).status).toBe(401);
  });

  it("404 when missing or out-of-band", async () => {
    findUniqueMock.mockResolvedValue(null);
    expect((await get("s1")).status).toBe(404);

    findUniqueMock.mockResolvedValue({ bandId: "band1" });
    isBandMemberMock.mockReturnValue(false);
    expect((await get("s1")).status).toBe(404);
  });

  it("returns the template with ordered songs", async () => {
    findUniqueMock.mockResolvedValue({
      id: "s1",
      bandId: "band1",
      name: "Full Set",
      songs: [{ id: "sg1", title: "Opener", position: 0 }]
    });
    const res = await get("s1");
    expect(res.status).toBe(200);
    expect((await res.json()).songs).toEqual([
      { id: "sg1", title: "Opener", position: 0 }
    ]);
  });
});

describe("PATCH /api/setlists/[id]", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await patch("s1", { name: "x" })).status).toBe(401);
  });

  it("404 when out-of-band, 403 when forbidden", async () => {
    findUniqueMock.mockResolvedValue(null);
    expect((await patch("s1", { name: "x" })).status).toBe(404);

    findUniqueMock.mockResolvedValue({ bandId: "band1" });
    canAccessContentMock.mockReturnValue(false);
    expect((await patch("s1", { name: "x" })).status).toBe(403);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("400 for a blank name", async () => {
    findUniqueMock.mockResolvedValue({ bandId: "band1" });
    expect((await patch("s1", { name: "" })).status).toBe(400);
  });

  it("renames the template", async () => {
    findUniqueMock.mockResolvedValue({ bandId: "band1" });
    updateMock.mockResolvedValue({ id: "s1", name: "Acoustic Set" });
    const res = await patch("s1", { name: "Acoustic Set" });
    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: { name: "Acoustic Set" } })
    );
  });
});

describe("DELETE /api/setlists/[id]", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await del("s1")).status).toBe(401);
  });

  it("403 when the caller can't access content", async () => {
    findUniqueMock.mockResolvedValue({ bandId: "band1" });
    canAccessContentMock.mockReturnValue(false);
    expect((await del("s1")).status).toBe(403);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("deletes the template", async () => {
    findUniqueMock.mockResolvedValue({ bandId: "band1" });
    const res = await del("s1");
    expect(res.status).toBe(200);
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "s1" } });
  });
});
