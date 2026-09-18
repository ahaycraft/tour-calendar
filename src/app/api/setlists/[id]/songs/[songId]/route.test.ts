import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { setlistSong: { findUnique: vi.fn(), delete: vi.fn() } }
}));
vi.mock("@/lib/band", () => ({
  canAccessContent: vi.fn(),
  isBandMember: vi.fn()
}));

import { DELETE } from "@/app/api/setlists/[id]/songs/[songId]/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessContent, isBandMember } from "@/lib/band";
import { jsonRequest, makeSession } from "@/test/factories";

const authMock = auth as unknown as Mock;
const findUniqueMock = prisma.setlistSong.findUnique as unknown as Mock;
const deleteMock = prisma.setlistSong.delete as unknown as Mock;
const isBandMemberMock = isBandMember as unknown as Mock;
const canAccessContentMock = canAccessContent as unknown as Mock;

const ctx = (id: string, songId: string) => ({
  params: Promise.resolve({ id, songId })
});
const del = (id: string, songId: string) =>
  DELETE(jsonRequest(undefined) as Parameters<typeof DELETE>[0], ctx(id, songId));

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue(makeSession());
  isBandMemberMock.mockReturnValue(true);
  canAccessContentMock.mockReturnValue(true);
  findUniqueMock.mockResolvedValue({
    setlistId: "s1",
    setlist: { bandId: "band1" }
  });
});

describe("DELETE /api/setlists/[id]/songs/[songId]", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await del("s1", "sg1")).status).toBe(401);
  });

  it("404 when the song doesn't exist or belongs to a different setlist", async () => {
    findUniqueMock.mockResolvedValue(null);
    expect((await del("s1", "sg1")).status).toBe(404);

    findUniqueMock.mockResolvedValue({ setlistId: "other", setlist: { bandId: "band1" } });
    expect((await del("s1", "sg1")).status).toBe(404);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("403 when the caller can't access content", async () => {
    canAccessContentMock.mockReturnValue(false);
    expect((await del("s1", "sg1")).status).toBe(403);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("deletes the song", async () => {
    const res = await del("s1", "sg1");
    expect(res.status).toBe(200);
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "sg1" } });
  });
});
