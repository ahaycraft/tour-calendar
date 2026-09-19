import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    show: { findMany: vi.fn() },
    bandMembership: { findMany: vi.fn() },
    liveActivityToken: { findMany: vi.fn() }
  }
}));
vi.mock("@/lib/apns", () => ({ pushToStartLiveActivity: vi.fn() }));

import { GET } from "@/app/api/push/live-activity-start/route";
import { prisma } from "@/lib/prisma";
import { pushToStartLiveActivity } from "@/lib/apns";

const findShowsMock = prisma.show.findMany as unknown as Mock;
const findMembersMock = prisma.bandMembership.findMany as unknown as Mock;
const findTokensMock = prisma.liveActivityToken.findMany as unknown as Mock;
const pushMock = vi.mocked(pushToStartLiveActivity);

function req(auth?: string) {
  return {
    headers: { get: (key: string) => (key === "authorization" ? auth : null) }
  } as unknown as Parameters<typeof GET>[0];
}

const ORIGINAL_SECRET = process.env.CRON_SECRET;

const show = {
  id: "show1",
  title: "The Roxy",
  date: new Date("2026-06-15T00:00:00Z"),
  venue: "The Roxy Theatre",
  city: "Los Angeles",
  state: "CA",
  venueAddress: null,
  loadInTime: null,
  doorsTime: new Date("2026-06-15T19:00:00Z"),
  setTime: null,
  bandId: "band1"
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "s3cr3t";
  findShowsMock.mockResolvedValue([]);
  findMembersMock.mockResolvedValue([]);
  findTokensMock.mockResolvedValue([]);
  pushMock.mockResolvedValue(true);
  vi.useFakeTimers();
  // Fixed "now": 2026-06-15 12:00 UTC (TZ is pinned to UTC in vitest.config).
  vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
  process.env.CRON_SECRET = ORIGINAL_SECRET;
});

describe("GET /api/push/live-activity-start — auth", () => {
  it("403 without the correct bearer secret", async () => {
    expect((await GET(req())).status).toBe(403);
    expect((await GET(req("Bearer wrong"))).status).toBe(403);
    expect(findShowsMock).not.toHaveBeenCalled();
  });

  it("403 when CRON_SECRET isn't configured", async () => {
    delete process.env.CRON_SECRET;
    expect((await GET(req("Bearer undefined"))).status).toBe(403);
  });

  it("200 with the correct bearer secret", async () => {
    expect((await GET(req("Bearer s3cr3t"))).status).toBe(200);
  });
});

describe("GET /api/push/live-activity-start — querying", () => {
  it("only looks at today's non-cancelled SHOW-type events", async () => {
    await GET(req("Bearer s3cr3t"));
    expect(findShowsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          type: "SHOW",
          status: { not: "CANCELLED" },
          date: {
            gte: new Date("2026-06-15T00:00:00Z"),
            lt: new Date("2026-06-16T00:00:00Z")
          }
        }
      })
    );
  });

  it("reports zero shows/pushed when nothing matches", async () => {
    const res = await GET(req("Bearer s3cr3t"));
    expect(await res.json()).toEqual({ shows: 0, pushed: 0 });
  });
});

describe("GET /api/push/live-activity-start — per-show handling", () => {
  it("skips a show whose band has no members", async () => {
    findShowsMock.mockResolvedValue([show]);
    findMembersMock.mockResolvedValue([]);
    const res = await GET(req("Bearer s3cr3t"));
    expect(findTokensMock).not.toHaveBeenCalled();
    expect(await res.json()).toEqual({ shows: 1, pushed: 0 });
  });

  it("skips a show whose members have no registered devices", async () => {
    findShowsMock.mockResolvedValue([show]);
    findMembersMock.mockResolvedValue([{ userId: "u1" }]);
    findTokensMock.mockResolvedValue([]);
    const res = await GET(req("Bearer s3cr3t"));
    expect(pushMock).not.toHaveBeenCalled();
    expect(await res.json()).toEqual({ shows: 1, pushed: 0 });
  });

  it("pushes every registered device with the show's content", async () => {
    findShowsMock.mockResolvedValue([show]);
    findMembersMock.mockResolvedValue([{ userId: "u1" }, { userId: "u2" }]);
    findTokensMock.mockResolvedValue([{ token: "tok-a" }, { token: "tok-b" }]);

    const res = await GET(req("Bearer s3cr3t"));

    expect(findTokensMock).toHaveBeenCalledWith({
      where: { userId: { in: ["u1", "u2"] } },
      select: { token: true }
    });
    expect(pushMock).toHaveBeenCalledTimes(2);
    expect(pushMock).toHaveBeenCalledWith("tok-a", {
      name: "UpcomingShowActivity",
      props: expect.objectContaining({ title: "The Roxy" })
    });
    expect(pushMock).toHaveBeenCalledWith("tok-b", {
      name: "UpcomingShowActivity",
      props: expect.objectContaining({ title: "The Roxy" })
    });
    expect(await res.json()).toEqual({ shows: 1, pushed: 2 });
  });

  it("only counts devices that actually succeeded", async () => {
    findShowsMock.mockResolvedValue([show]);
    findMembersMock.mockResolvedValue([{ userId: "u1" }]);
    findTokensMock.mockResolvedValue([{ token: "tok-a" }, { token: "tok-stale" }]);
    pushMock.mockImplementation(async (token) => token !== "tok-stale");

    const res = await GET(req("Bearer s3cr3t"));

    expect(await res.json()).toEqual({ shows: 1, pushed: 1 });
  });
});
