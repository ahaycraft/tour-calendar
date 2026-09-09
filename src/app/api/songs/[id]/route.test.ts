import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    song: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() }
  }
}));
vi.mock("@/lib/band", () => ({
  canManage: vi.fn(),
  isBandMember: vi.fn()
}));

import { DELETE, PATCH } from "@/app/api/songs/[id]/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManage, isBandMember } from "@/lib/band";
import { jsonRequest, makeSession, routeCtx } from "@/test/factories";

const authMock = auth as unknown as Mock;
const findUniqueMock = prisma.song.findUnique as unknown as Mock;
const updateMock = prisma.song.update as unknown as Mock;
const deleteMock = prisma.song.delete as unknown as Mock;
const isBandMemberMock = vi.mocked(isBandMember);
const canManageMock = vi.mocked(canManage);

const patch = (id: string, body: unknown) =>
  PATCH(jsonRequest(body) as Parameters<typeof PATCH>[0], routeCtx(id));
const del = (id: string) =>
  DELETE({} as Parameters<typeof DELETE>[0], routeCtx(id));

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue(makeSession());
  isBandMemberMock.mockReturnValue(true);
  canManageMock.mockReturnValue(true);
  findUniqueMock.mockResolvedValue({ bandId: "band1", createdById: "u1" });
  updateMock.mockResolvedValue({ id: "s1", updatedAt: new Date() });
});

describe("PATCH /api/songs/[id] — guards", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await patch("s1", {})).status).toBe(401);
  });

  it("404 when the song doesn't exist or the caller isn't in its band", async () => {
    findUniqueMock.mockResolvedValue(null);
    expect((await patch("s1", {})).status).toBe(404);

    findUniqueMock.mockResolvedValue({ bandId: "band1", createdById: "u1" });
    isBandMemberMock.mockReturnValue(false);
    expect((await patch("s1", {})).status).toBe(404);
  });

  it("400 for an empty title or an invalid status", async () => {
    expect((await patch("s1", { title: "   " })).status).toBe(400);
    expect((await patch("s1", { status: "RELEASED_FOREVER" })).status).toBe(
      400
    );
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/songs/[id] — duration", () => {
  it("stores a plain integer number of seconds", async () => {
    await patch("s1", { duration: 225 });
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ duration: 225 }) })
    );
  });

  it("rounds a fractional value and rejects a negative one", async () => {
    await patch("s1", { duration: 225.6 });
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ duration: 226 }) })
    );

    await patch("s1", { duration: -5 });
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ duration: null }) })
    );
  });

  it("clears duration on null or an empty string", async () => {
    await patch("s1", { duration: null });
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ duration: null }) })
    );

    await patch("s1", { duration: "" });
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ duration: null }) })
    );
  });

  it("treats an unparsable value as null rather than erroring", async () => {
    await patch("s1", { duration: "not a number" });
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ duration: null }) })
    );
  });

  it("leaves duration untouched when omitted from the body", async () => {
    await patch("s1", { title: "New title" });
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ duration: expect.anything() })
      })
    );
  });
});

describe("DELETE /api/songs/[id]", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await del("s1")).status).toBe(401);
  });

  it("404 when the song doesn't exist or the caller isn't in its band", async () => {
    findUniqueMock.mockResolvedValue(null);
    expect((await del("s1")).status).toBe(404);
  });

  it("403 when the caller can't manage the song", async () => {
    canManageMock.mockReturnValue(false);
    expect((await del("s1")).status).toBe(403);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("deletes the song when allowed", async () => {
    const res = await del("s1");
    expect(res.status).toBe(200);
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "s1" } });
  });
});
