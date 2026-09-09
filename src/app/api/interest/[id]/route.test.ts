import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { interestSubmission: { update: vi.fn() } }
}));

import { PATCH } from "@/app/api/interest/[id]/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { jsonRequest, makeSession, routeCtx } from "@/test/factories";

const authMock = auth as unknown as Mock;
const updateMock = prisma.interestSubmission.update as unknown as Mock;

const call = (body: unknown, id = "sub1") =>
  PATCH(jsonRequest(body) as Parameters<typeof PATCH>[0], routeCtx(id));

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue(makeSession({ userId: "admin1" }));
});

describe("PATCH /api/interest/[id]", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    const res = await call({ contacted: true });
    expect(res.status).toBe(401);
  });

  it("403 for a non-admin session", async () => {
    const res = await call({ contacted: true });
    expect(res.status).toBe(403);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("400 when contacted isn't a boolean", async () => {
    authMock.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    const res = await call({ contacted: "yes" });
    expect(res.status).toBe(400);
  });

  it("sets contactedAt to now when contacted: true", async () => {
    authMock.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    updateMock.mockResolvedValue({ id: "sub1", contactedAt: new Date() });
    const res = await call({ contacted: true });
    expect(res.status).toBe(200);
    const data = updateMock.mock.calls[0][0].data;
    expect(data.contactedAt).toBeInstanceOf(Date);
  });

  it("clears contactedAt when contacted: false", async () => {
    authMock.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    updateMock.mockResolvedValue({ id: "sub1", contactedAt: null });
    const res = await call({ contacted: false });
    expect(res.status).toBe(200);
    expect(updateMock.mock.calls[0][0].data).toEqual({ contactedAt: null });
  });

  it("404s if the submission doesn't exist", async () => {
    authMock.mockResolvedValue({ user: { id: "admin1", role: "ADMIN" } });
    updateMock.mockRejectedValue(new Error("not found"));
    const res = await call({ contacted: true });
    expect(res.status).toBe(404);
  });
});
