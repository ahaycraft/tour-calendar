import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { memberUnavailability: { findMany: vi.fn() } },
}));
vi.mock("@/lib/band", () => ({ getActiveBandId: vi.fn() }));

import { GET } from "@/app/api/unavailability/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getActiveBandId } from "@/lib/band";
import { makeSession, urlRequest } from "@/test/factories";

const authMock = auth as unknown as Mock;
const findManyMock = prisma.memberUnavailability.findMany as unknown as Mock;
const getActiveBandIdMock = vi.mocked(getActiveBandId);

const list = (url: string) => GET(urlRequest(url) as Parameters<typeof GET>[0]);

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue(makeSession());
  getActiveBandIdMock.mockResolvedValue("band1");
});

describe("GET /api/unavailability", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    const res = await list("/api/unavailability?from=2026-06-01&to=2026-07-01");
    expect(res.status).toBe(401);
  });

  it("400 when from or to is missing", async () => {
    expect((await list("/api/unavailability")).status).toBe(400);
    expect((await list("/api/unavailability?from=2026-06-01")).status).toBe(400);
  });

  it("400 for an unparseable from or to", async () => {
    const res = await list("/api/unavailability?from=nope&to=2026-07-01");
    expect(res.status).toBe(400);
  });

  it("scopes the query to the active band's members and the date range", async () => {
    findManyMock.mockResolvedValue([]);
    const res = await list("/api/unavailability?from=2026-06-01&to=2026-07-01");
    expect(res.status).toBe(200);
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          date: {
            gte: new Date("2026-06-01T00:00:00Z"),
            lt: new Date("2026-07-01T00:00:00Z"),
          },
          user: { bandMemberships: { some: { bandId: "band1" } } },
        },
      })
    );
  });
});
