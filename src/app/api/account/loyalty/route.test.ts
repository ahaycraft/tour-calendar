import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { loyaltyAccount: { findMany: vi.fn(), create: vi.fn() } }
}));

import { GET, POST } from "@/app/api/account/loyalty/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { jsonRequest, makeSession } from "@/test/factories";

const authMock = auth as unknown as Mock;
const findManyMock = prisma.loyaltyAccount.findMany as unknown as Mock;
const createMock = prisma.loyaltyAccount.create as unknown as Mock;

const list = () => GET(jsonRequest(undefined) as Parameters<typeof GET>[0]);
const call = (body: unknown) =>
  POST(jsonRequest(body) as Parameters<typeof POST>[0]);

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue(makeSession({ userId: "u1" }));
});

describe("GET /api/account/loyalty", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await list()).status).toBe(401);
  });

  it("scopes the query to the signed-in user", async () => {
    findManyMock.mockResolvedValue([]);
    await list();
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1" } })
    );
  });
});

describe("POST /api/account/loyalty", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await call({ type: "HOTEL", program: "x", memberNumber: "1" })).status).toBe(
      401
    );
  });

  it("400 for an invalid type", async () => {
    const res = await call({ type: "CAR", program: "x", memberNumber: "1" });
    expect(res.status).toBe(400);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("400 for a missing program or member number", async () => {
    expect((await call({ type: "HOTEL", memberNumber: "1" })).status).toBe(400);
    expect((await call({ type: "HOTEL", program: "x" })).status).toBe(400);
  });

  it("creates a trimmed loyalty account for the signed-in user", async () => {
    createMock.mockResolvedValue({
      id: "l1",
      type: "HOTEL",
      program: "Marriott Bonvoy",
      memberNumber: "12345"
    });
    const res = await call({
      type: "HOTEL",
      program: "  Marriott Bonvoy  ",
      memberNumber: "  12345  "
    });
    expect(res.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          userId: "u1",
          type: "HOTEL",
          program: "Marriott Bonvoy",
          memberNumber: "12345"
        }
      })
    );
  });
});
