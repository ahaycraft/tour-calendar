import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    show: { findUnique: vi.fn() },
    showSetlistSong: { findUnique: vi.fn(), delete: vi.fn() }
  }
}));
vi.mock("@/lib/band", () => ({
  canAccessContent: vi.fn(),
  isBandMember: vi.fn()
}));

import { DELETE } from "@/app/api/shows/[id]/setlist/songs/[songId]/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessContent, isBandMember } from "@/lib/band";
import { jsonRequest, makeSession } from "@/test/factories";

const authMock = auth as unknown as Mock;
const showFindUniqueMock = prisma.show.findUnique as unknown as Mock;
const songFindUniqueMock = prisma.showSetlistSong.findUnique as unknown as Mock;
const deleteMock = prisma.showSetlistSong.delete as unknown as Mock;
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
  showFindUniqueMock.mockResolvedValue({ bandId: "band1" });
  songFindUniqueMock.mockResolvedValue({ showSetlist: { showId: "show1" } });
});

describe("DELETE /api/shows/[id]/setlist/songs/[songId]", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await del("show1", "sg1")).status).toBe(401);
  });

  it("404 when the show doesn't exist or the caller isn't in its band", async () => {
    showFindUniqueMock.mockResolvedValue(null);
    expect((await del("show1", "sg1")).status).toBe(404);
  });

  it("403 when the caller can't access content", async () => {
    canAccessContentMock.mockReturnValue(false);
    expect((await del("show1", "sg1")).status).toBe(403);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("404 when the song belongs to a different show", async () => {
    songFindUniqueMock.mockResolvedValue({ showSetlist: { showId: "other" } });
    expect((await del("show1", "sg1")).status).toBe(404);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("deletes the song", async () => {
    const res = await del("show1", "sg1");
    expect(res.status).toBe(200);
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "sg1" } });
  });
});
