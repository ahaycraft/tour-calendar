import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { update: vi.fn(), upsert: vi.fn(), delete: vi.fn() },
    bandMembership: { findMany: vi.fn(), count: vi.fn() },
    show: { updateMany: vi.fn() },
    song: { updateMany: vi.fn() },
    release: { updateMany: vi.fn() },
    recordingPlan: { updateMany: vi.fn() },
    songDemo: { updateMany: vi.fn() },
    recordingPart: { updateMany: vi.fn() },
    bandInvite: { updateMany: vi.fn() },
    $transaction: vi.fn()
  }
}));

import { DELETE, PATCH } from "@/app/api/account/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { jsonRequest, makeSession } from "@/test/factories";

const authMock = auth as unknown as Mock;
const updateMock = prisma.user.update as unknown as Mock;
const upsertMock = prisma.user.upsert as unknown as Mock;
const deleteMock = prisma.user.delete as unknown as Mock;
const findMembershipsMock = prisma.bandMembership.findMany as unknown as Mock;
const countOwnersMock = prisma.bandMembership.count as unknown as Mock;
const transactionMock = prisma.$transaction as unknown as Mock;
const showUpdateManyMock = prisma.show.updateMany as unknown as Mock;
const bandInviteUpdateManyMock = prisma.bandInvite.updateMany as unknown as Mock;

const patch = (body: unknown) =>
  PATCH(jsonRequest(body) as Parameters<typeof PATCH>[0]);
const del = () => DELETE(jsonRequest({}) as Parameters<typeof DELETE>[0]);

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue(makeSession());
  updateMock.mockImplementation(
    async (args: { data: { name?: string; phone?: string | null } }) =>
      ({ id: "u1", ...args.data }) as never
  );
  findMembershipsMock.mockResolvedValue([]); // owns no bands, by default
  countOwnersMock.mockResolvedValue(2);
  upsertMock.mockResolvedValue({ id: "deleted-user-placeholder" });
  transactionMock.mockImplementation(async (ops: unknown[]) =>
    Promise.all(ops as Promise<unknown>[])
  );
  showUpdateManyMock.mockResolvedValue({ count: 0 });
  (prisma.song.updateMany as unknown as Mock).mockResolvedValue({ count: 0 });
  (prisma.release.updateMany as unknown as Mock).mockResolvedValue({
    count: 0
  });
  (prisma.recordingPlan.updateMany as unknown as Mock).mockResolvedValue({
    count: 0
  });
  (prisma.songDemo.updateMany as unknown as Mock).mockResolvedValue({
    count: 0
  });
  (prisma.recordingPart.updateMany as unknown as Mock).mockResolvedValue({
    count: 0
  });
  bandInviteUpdateManyMock.mockResolvedValue({ count: 0 });
  deleteMock.mockResolvedValue({ id: "u1" });
});

describe("PATCH /api/account", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await patch({ phone: "2178885757" })).status).toBe(401);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("400 when phone is neither a string nor null", async () => {
    expect((await patch({ phone: 2178885757 })).status).toBe(400);
    expect((await patch({ phone: {} })).status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("400 for a string that doesn't look like a phone number", async () => {
    const res = await patch({ phone: "not a phone" });
    expect(res.status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("saves a trimmed, validly-formatted phone number for the caller", async () => {
    const res = await patch({ phone: " +1 (217) 888-5757 " });
    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { phone: "+1 (217) 888-5757" },
      select: { id: true, name: true, phone: true }
    });
    expect(await res.json()).toEqual({ id: "u1", phone: "+1 (217) 888-5757" });
  });

  it("400 when name is not a string", async () => {
    const res = await patch({ name: 5 });
    expect(res.status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("400 when name is empty or whitespace-only", async () => {
    expect((await patch({ name: "" })).status).toBe(400);
    expect((await patch({ name: "   " })).status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("saves a trimmed name and leaves phone untouched", async () => {
    const res = await patch({ name: "  Jordan Lee  " });
    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { name: "Jordan Lee" },
      select: { id: true, name: true, phone: true }
    });
  });

  it("saves name and phone together", async () => {
    await patch({ name: "Jordan Lee", phone: "2178885757" });
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { name: "Jordan Lee", phone: "2178885757" }
      })
    );
  });

  it("clears the phone number when given an empty/whitespace string", async () => {
    const res = await patch({ phone: "   " });
    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: { phone: null } })
    );
  });

  it("clears the phone number when given null", async () => {
    const res = await patch({ phone: null });
    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: { phone: null } })
    );
  });

  it("scopes the update to the signed-in user, not an arbitrary id", async () => {
    authMock.mockResolvedValue(makeSession({ userId: "someone-else" }));
    await patch({ phone: "2178885757" });
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "someone-else" } })
    );
  });
});

describe("DELETE /api/account", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await del()).status).toBe(401);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("400 when the caller is the sole owner of a band, naming it", async () => {
    findMembershipsMock.mockResolvedValue([
      { bandId: "band1", band: { name: "The Wailers" } }
    ]);
    countOwnersMock.mockResolvedValue(1);

    const res = await del();
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("The Wailers");
    expect(transactionMock).not.toHaveBeenCalled();
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("succeeds when a co-owner exists, even if the caller owns a band", async () => {
    findMembershipsMock.mockResolvedValue([
      { bandId: "band1", band: { name: "The Wailers" } }
    ]);
    countOwnersMock.mockResolvedValue(2); // caller + at least one other owner

    const res = await del();
    expect(res.status).toBe(200);
    expect(transactionMock).toHaveBeenCalled();
  });

  it("reassigns created/assigned content to the placeholder before deleting the user", async () => {
    authMock.mockResolvedValue(makeSession({ userId: "u1" }));
    await del();

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: "deleted-user@system.internal" }
      })
    );
    expect(showUpdateManyMock).toHaveBeenCalledWith({
      where: { createdById: "u1" },
      data: { createdById: "deleted-user-placeholder" }
    });
    expect(bandInviteUpdateManyMock).toHaveBeenCalledWith({
      where: { invitedById: "u1" },
      data: { invitedById: "deleted-user-placeholder" }
    });
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "u1" } });
  });

  it("scopes deletion to the signed-in user, not an arbitrary id", async () => {
    authMock.mockResolvedValue(makeSession({ userId: "someone-else" }));
    await del();
    expect(deleteMock).toHaveBeenCalledWith({
      where: { id: "someone-else" }
    });
  });
});
