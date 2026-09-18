import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    loyaltyAccount: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() }
  }
}));

import { DELETE, PATCH } from "@/app/api/account/loyalty/[id]/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { jsonRequest, makeSession, routeCtx } from "@/test/factories";

const authMock = auth as unknown as Mock;
const findUniqueMock = prisma.loyaltyAccount.findUnique as unknown as Mock;
const updateMock = prisma.loyaltyAccount.update as unknown as Mock;
const deleteMock = prisma.loyaltyAccount.delete as unknown as Mock;

const patch = (id: string, body: unknown) =>
  PATCH(jsonRequest(body) as Parameters<typeof PATCH>[0], routeCtx(id));
const del = (id: string) =>
  DELETE(jsonRequest(undefined) as Parameters<typeof DELETE>[0], routeCtx(id));

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue(makeSession({ userId: "u1" }));
});

describe("PATCH /api/account/loyalty/[id]", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await patch("l1", { program: "x" })).status).toBe(401);
  });

  it("404 when the account doesn't exist or belongs to someone else", async () => {
    findUniqueMock.mockResolvedValue(null);
    expect((await patch("l1", { program: "x" })).status).toBe(404);

    findUniqueMock.mockResolvedValue({ userId: "u2" });
    expect((await patch("l1", { program: "x" })).status).toBe(404);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("400 for an invalid type or blank field", async () => {
    findUniqueMock.mockResolvedValue({ userId: "u1" });
    expect((await patch("l1", { type: "CAR" })).status).toBe(400);
    expect((await patch("l1", { program: "  " })).status).toBe(400);
    expect((await patch("l1", { memberNumber: "" })).status).toBe(400);
  });

  it("updates only the given fields, trimmed", async () => {
    findUniqueMock.mockResolvedValue({ userId: "u1" });
    updateMock.mockResolvedValue({});
    await patch("l1", { memberNumber: "  999  " });
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "l1" },
        data: { memberNumber: "999" }
      })
    );
  });
});

describe("DELETE /api/account/loyalty/[id]", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await del("l1")).status).toBe(401);
  });

  it("404 when the account belongs to someone else", async () => {
    findUniqueMock.mockResolvedValue({ userId: "u2" });
    expect((await del("l1")).status).toBe(404);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("deletes the caller's own account", async () => {
    findUniqueMock.mockResolvedValue({ userId: "u1" });
    const res = await del("l1");
    expect(res.status).toBe(200);
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "l1" } });
  });
});
