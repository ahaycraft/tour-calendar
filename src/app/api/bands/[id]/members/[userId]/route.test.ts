import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    bandMembership: {
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }
  }
}));
vi.mock("@/lib/band", () => ({ bandRole: vi.fn() }));

import { DELETE, PATCH } from "@/app/api/bands/[id]/members/[userId]/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { bandRole } from "@/lib/band";
import { jsonRequest, makeSession } from "@/test/factories";

const authMock = auth as unknown as Mock;
const countMock = prisma.bandMembership.count as unknown as Mock;
const findMembershipMock = prisma.bandMembership.findUnique as unknown as Mock;
const updateMembershipMock = prisma.bandMembership.update as unknown as Mock;
const deleteMembershipMock = prisma.bandMembership.delete as unknown as Mock;
const bandRoleMock = bandRole as unknown as Mock;

const ctx = (userId: string) => ({
  params: Promise.resolve({ id: "band1", userId })
});
const patch = (userId: string, body: unknown) =>
  PATCH(jsonRequest(body) as Parameters<typeof PATCH>[0], ctx(userId));
const del = (userId: string) =>
  DELETE({} as Parameters<typeof DELETE>[0], ctx(userId));

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue(makeSession({ userId: "u1" }));
  countMock.mockResolvedValue(2); // 2 owners by default — demoting/removing one is fine
});

describe("PATCH /api/bands/[id]/members/[userId] — role change", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await patch("u2", { role: "ADMIN" })).status).toBe(401);
  });

  it("403 when the caller isn't an owner", async () => {
    bandRoleMock.mockReturnValue("ADMIN");
    expect((await patch("u2", { role: "ADMIN" })).status).toBe(403);
    expect(updateMembershipMock).not.toHaveBeenCalled();
  });

  it("400 for a role outside OWNER/ADMIN/MEMBER", async () => {
    bandRoleMock.mockReturnValue("OWNER");
    expect((await patch("u2", { role: "SUPERADMIN" })).status).toBe(400);
  });

  it("404 when the target isn't a member of this band", async () => {
    bandRoleMock.mockReturnValue("OWNER");
    findMembershipMock.mockResolvedValue(null);
    expect((await patch("u2", { role: "ADMIN" })).status).toBe(404);
  });

  it("400 when demoting the band's last owner", async () => {
    bandRoleMock.mockReturnValue("OWNER");
    findMembershipMock.mockResolvedValue({ role: "OWNER" });
    countMock.mockResolvedValue(1); // this target is the only owner
    const res = await patch("u2", { role: "MEMBER" });
    expect(res.status).toBe(400);
    expect(updateMembershipMock).not.toHaveBeenCalled();
  });

  it("allows demoting an owner when another owner remains", async () => {
    bandRoleMock.mockReturnValue("OWNER");
    findMembershipMock.mockResolvedValue({ role: "OWNER" });
    countMock.mockResolvedValue(2);
    const res = await patch("u2", { role: "MEMBER" });
    expect(res.status).toBe(200);
    expect(updateMembershipMock).toHaveBeenCalledWith({
      where: { bandId_userId: { bandId: "band1", userId: "u2" } },
      data: { role: "MEMBER" }
    });
  });

  it("allows promoting a member without touching the owner count", async () => {
    bandRoleMock.mockReturnValue("OWNER");
    findMembershipMock.mockResolvedValue({ role: "MEMBER" });
    const res = await patch("u2", { role: "ADMIN" });
    expect(res.status).toBe(200);
    expect(updateMembershipMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: { role: "ADMIN" } })
    );
  });
});

describe("DELETE /api/bands/[id]/members/[userId] — remove or leave", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await del("u2")).status).toBe(401);
  });

  it("403 when a non-owner tries to remove someone else", async () => {
    bandRoleMock.mockReturnValue("ADMIN");
    expect((await del("u2")).status).toBe(403);
    expect(deleteMembershipMock).not.toHaveBeenCalled();
  });

  it("lets a non-owner remove (leave as) themself", async () => {
    bandRoleMock.mockReturnValue("MEMBER");
    findMembershipMock.mockResolvedValue({ role: "MEMBER" });
    const res = await del("u1"); // same id as the signed-in session user
    expect(res.status).toBe(200);
    expect(deleteMembershipMock).toHaveBeenCalledWith({
      where: { bandId_userId: { bandId: "band1", userId: "u1" } }
    });
  });

  it("404 when the target isn't a member of this band", async () => {
    bandRoleMock.mockReturnValue("OWNER");
    findMembershipMock.mockResolvedValue(null);
    expect((await del("u2")).status).toBe(404);
  });

  it("400 when removing/leaving would take the band's last owner", async () => {
    bandRoleMock.mockReturnValue("OWNER");
    findMembershipMock.mockResolvedValue({ role: "OWNER" });
    countMock.mockResolvedValue(1);
    const res = await del("u1");
    expect(res.status).toBe(400);
    expect(deleteMembershipMock).not.toHaveBeenCalled();
  });

  it("allows an owner to remove another member when an owner remains", async () => {
    bandRoleMock.mockReturnValue("OWNER");
    findMembershipMock.mockResolvedValue({ role: "MEMBER" });
    const res = await del("u2");
    expect(res.status).toBe(200);
    expect(deleteMembershipMock).toHaveBeenCalledWith({
      where: { bandId_userId: { bandId: "band1", userId: "u2" } }
    });
  });
});
