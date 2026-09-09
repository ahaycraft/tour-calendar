import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    show: { findMany: vi.fn(), update: vi.fn() },
    bandMembership: { findMany: vi.fn() }
  }
}));
vi.mock("@/lib/push", () => ({ sendPushToUsers: vi.fn() }));

import { GET } from "@/app/api/push/event-reminders/route";
import { prisma } from "@/lib/prisma";
import { sendPushToUsers } from "@/lib/push";

const findEventsMock = prisma.show.findMany as unknown as Mock;
const findMembersMock = prisma.bandMembership.findMany as unknown as Mock;
const updateShowMock = prisma.show.update as unknown as Mock;
const sendPushMock = vi.mocked(sendPushToUsers);

function req(auth?: string) {
  return {
    headers: { get: (key: string) => (key === "authorization" ? auth : null) }
  } as unknown as Parameters<typeof GET>[0];
}

const ORIGINAL_SECRET = process.env.CRON_SECRET;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "s3cr3t";
  findEventsMock.mockResolvedValue([]);
  findMembersMock.mockResolvedValue([]);
  updateShowMock.mockResolvedValue({});
  vi.useFakeTimers();
  // Fixed "now": 2026-06-15 12:00 UTC (TZ is pinned to UTC in vitest.config).
  vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
  process.env.CRON_SECRET = ORIGINAL_SECRET;
});

describe("GET /api/push/event-reminders — auth", () => {
  it("403 without the correct bearer secret", async () => {
    expect((await GET(req())).status).toBe(403);
    expect((await GET(req("Bearer wrong"))).status).toBe(403);
    expect(findEventsMock).not.toHaveBeenCalled();
  });

  it("403 when CRON_SECRET isn't configured, even with a matching-looking header", async () => {
    delete process.env.CRON_SECRET;
    expect((await GET(req("Bearer undefined"))).status).toBe(403);
  });

  it("200 with the correct bearer secret", async () => {
    expect((await GET(req("Bearer s3cr3t"))).status).toBe(200);
  });
});

describe("GET /api/push/event-reminders — querying", () => {
  it("only looks at tomorrow's non-cancelled, not-yet-reminded events", async () => {
    await GET(req("Bearer s3cr3t"));
    expect(findEventsMock).toHaveBeenCalledWith({
      where: {
        status: { not: "CANCELLED" },
        date: {
          gte: new Date("2026-06-16T00:00:00Z"),
          lt: new Date("2026-06-17T00:00:00Z")
        },
        remindedAt: null
      },
      select: { id: true, type: true, title: true, venue: true, city: true, bandId: true }
    });
  });

  it("reports zero events/notified when nothing matches", async () => {
    const res = await GET(req("Bearer s3cr3t"));
    expect(await res.json()).toEqual({ events: 0, notified: 0 });
  });
});

describe("GET /api/push/event-reminders — per-event handling", () => {
  const event = {
    id: "show1",
    type: "SHOW",
    title: "The Roxy",
    venue: "The Roxy Theatre",
    city: "Los Angeles",
    bandId: "band1"
  };

  it("pushes every band member and stamps remindedAt", async () => {
    findEventsMock.mockResolvedValue([event]);
    findMembersMock.mockResolvedValue([{ userId: "u1" }, { userId: "u2" }]);

    const res = await GET(req("Bearer s3cr3t"));

    expect(sendPushMock).toHaveBeenCalledWith(
      ["u1", "u2"],
      expect.objectContaining({
        title: "Show tomorrow: The Roxy",
        body: "The Roxy Theatre, Los Angeles",
        tag: "event-reminder-show1"
      })
    );
    expect(updateShowMock).toHaveBeenCalledWith({
      where: { id: "show1" },
      data: { remindedAt: expect.any(Date) }
    });
    expect(await res.json()).toEqual({ events: 1, notified: 1 });
  });

  it("falls back to a generic body when venue/city are unset", async () => {
    findEventsMock.mockResolvedValue([
      { ...event, venue: null, city: null }
    ]);
    findMembersMock.mockResolvedValue([{ userId: "u1" }]);

    await GET(req("Bearer s3cr3t"));

    expect(sendPushMock).toHaveBeenCalledWith(
      ["u1"],
      expect.objectContaining({ body: "Details are in Woodshedd." })
    );
  });

  it("still stamps remindedAt but skips the push when the band has no members", async () => {
    findEventsMock.mockResolvedValue([event]);
    findMembersMock.mockResolvedValue([]);

    const res = await GET(req("Bearer s3cr3t"));

    expect(sendPushMock).not.toHaveBeenCalled();
    expect(updateShowMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "show1" } })
    );
    expect(await res.json()).toEqual({ events: 1, notified: 0 });
  });

  it("never reminds the same event twice, even across a single run's events", async () => {
    findEventsMock.mockResolvedValue([event, { ...event, id: "show2" }]);
    findMembersMock.mockResolvedValue([{ userId: "u1" }]);

    await GET(req("Bearer s3cr3t"));

    expect(updateShowMock).toHaveBeenCalledTimes(2);
    expect(updateShowMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "show1" } })
    );
    expect(updateShowMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "show2" } })
    );
  });
});
