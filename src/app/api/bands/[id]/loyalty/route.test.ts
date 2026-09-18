import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findMany: vi.fn() } }
}));
vi.mock("@/lib/band", () => ({ isBandMember: vi.fn() }));

import { GET } from "@/app/api/bands/[id]/loyalty/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isBandMember } from "@/lib/band";
import { jsonRequest, makeSession, routeCtx } from "@/test/factories";

const authMock = auth as unknown as Mock;
const findManyMock = prisma.user.findMany as unknown as Mock;
const isBandMemberMock = isBandMember as unknown as Mock;

const get = (id: string) =>
  GET(jsonRequest(undefined) as Parameters<typeof GET>[0], routeCtx(id));

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue(makeSession());
});

describe("GET /api/bands/[id]/loyalty", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await get("band1")).status).toBe(401);
  });

  it("404 when the caller isn't a member of the band", async () => {
    isBandMemberMock.mockReturnValue(false);
    expect((await get("band1")).status).toBe(404);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("returns every member's accounts, reshaped under userId/name/accounts", async () => {
    isBandMemberMock.mockReturnValue(true);
    findManyMock.mockResolvedValue([
      {
        id: "u1",
        name: "Alex",
        loyaltyAccounts: [
          { id: "l1", type: "HOTEL", program: "Marriott Bonvoy", memberNumber: "123" }
        ]
      },
      { id: "u2", name: "Sam", loyaltyAccounts: [] }
    ]);
    const res = await get("band1");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([
      {
        userId: "u1",
        name: "Alex",
        accounts: [
          { id: "l1", type: "HOTEL", program: "Marriott Bonvoy", memberNumber: "123" }
        ]
      },
      { userId: "u2", name: "Sam", accounts: [] }
    ]);
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { bandMemberships: { some: { bandId: "band1" } } }
      })
    );
  });
});
