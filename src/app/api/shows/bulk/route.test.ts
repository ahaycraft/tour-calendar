import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => {
  const prisma: Record<string, unknown> = {
    show: {
      createManyAndReturn: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
  };
  prisma.$transaction = vi.fn(async (arg: unknown) =>
    typeof arg === "function"
      ? (arg as (tx: unknown) => unknown)(prisma)
      : Promise.all(arg as unknown[])
  );
  return { prisma };
});
vi.mock("@/lib/band", () => ({
  getActiveBandId: vi.fn(),
  canManage: vi.fn(),
  isBandMember: vi.fn(),
}));
vi.mock("@/lib/push", () => ({ notifyBandMembers: vi.fn() }));

import { PATCH, POST } from "@/app/api/shows/bulk/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManage, getActiveBandId, isBandMember } from "@/lib/band";
import { notifyBandMembers } from "@/lib/push";
import { jsonRequest, makeSession, makeShow } from "@/test/factories";

// See the shows route test: cast next-auth / Prisma doubles to a plain Mock.
const authMock = auth as unknown as Mock;
const createManyMock = prisma.show.createManyAndReturn as unknown as Mock;
const findManyMock = prisma.show.findMany as unknown as Mock;
const updateManyMock = prisma.show.updateMany as unknown as Mock;
const updateMock = prisma.show.update as unknown as Mock;
const getActiveBandIdMock = vi.mocked(getActiveBandId);
const isBandMemberMock = vi.mocked(isBandMember);
const canManageMock = vi.mocked(canManage);
const notifyMock = vi.mocked(notifyBandMembers);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const post = (body: unknown) =>
  POST(jsonRequest(body) as Parameters<typeof POST>[0]);
const patch = (body: unknown) =>
  PATCH(jsonRequest(body) as Parameters<typeof PATCH>[0]);

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue(makeSession());
  getActiveBandIdMock.mockResolvedValue("band1");
  isBandMemberMock.mockReturnValue(true);
  canManageMock.mockReturnValue(true);
  createManyMock.mockImplementation(
    async (args: { data: unknown[] }) =>
      args.data.map((_, i) => ({ id: `c${i}` })) as never
  );
});

describe("POST /api/shows/bulk — guards", () => {
  it.each([
    ["no session", () => authMock.mockResolvedValue(null), { name: "T", dates: ["2026-06-15"] }, 401],
    ["bad type", () => {}, { type: "TOUR", name: "T", dates: ["2026-06-15"] }, 400],
    ["blank name", () => {}, { name: "  ", dates: ["2026-06-15"] }, 400],
    ["no dates", () => {}, { name: "T", dates: [] }, 400],
    ["malformed date", () => {}, { name: "T", dates: ["06/15/2026"] }, 400],
    ["too many dates", () => {}, { name: "T", dates: Array.from({ length: 91 }, () => "2026-06-15") }, 400],
  ])("%s → %i", async (_label, arrange, body, status) => {
    arrange();
    expect((await post(body)).status).toBe(status);
  });

  it("400 when there's no active band", async () => {
    getActiveBandIdMock.mockResolvedValue(null);
    expect((await post({ name: "T", dates: ["2026-06-15"] })).status).toBe(400);
  });
});

describe("POST /api/shows/bulk — create + notify", () => {
  it("stamps one shared tourGroupId + tourName and titles days in order", async () => {
    const res = await post({
      name: "  Fall Tour  ",
      dates: ["2026-09-03", "2026-09-01", "2026-09-02"],
    });

    expect(res.status).toBe(201);
    const rows = createManyMock.mock.calls[0][0].data as Array<{
      title: string;
      tourGroupId: string;
      tourName: string;
      type: string;
      date: Date;
    }>;
    expect(rows.map((r) => r.title)).toEqual([
      "Fall Tour — Day 1",
      "Fall Tour — Day 2",
      "Fall Tour — Day 3",
    ]);
    expect(new Set(rows.map((r) => r.tourGroupId)).size).toBe(1);
    expect(rows[0].tourGroupId).toMatch(UUID_RE);
    expect(rows.every((r) => r.tourName === "Fall Tour")).toBe(true);

    const json = (await res.json()) as { tourGroupId: string; count: number };
    expect(json.count).toBe(3);
    expect(notifyMock).toHaveBeenCalledWith("band1", "u1", {
      title: "New tour: Fall Tour",
      body: "3 days added — tap to set your availability.",
      url: "/calendar",
      tag: `tour:${json.tourGroupId}`,
    });
  });

  it("uses the practice-block label and a singular day count", async () => {
    await post({ type: "PRACTICE", name: "Rehearsals", dates: ["2026-09-01"] });
    expect(notifyMock).toHaveBeenCalledWith(
      "band1",
      "u1",
      expect.objectContaining({
        title: "New practice block: Rehearsals",
        body: "1 day added — tap to set your availability.",
      })
    );
  });
});

// --- PATCH: block-wide edit -------------------------------------------------

const group = (over: Partial<ReturnType<typeof makeShow>> = {}) => [
  makeShow({ id: "d1", tourGroupId: "grp1", tourName: "Fall Tour", date: new Date("2026-09-01T00:00:00Z"), ...over }),
  makeShow({ id: "d2", tourGroupId: "grp1", tourName: "Fall Tour", date: new Date("2026-09-02T00:00:00Z"), ...over }),
];

/** The form always re-sends every field; this is "no change from current". */
const unchangedPayload = {
  tourGroupId: "grp1",
  name: "Fall Tour",
  city: "",
  state: "",
  country: "US",
  status: "PENDING",
  notes: "",
};

describe("PATCH /api/shows/bulk — guards", () => {
  it("401 / 400 / 404 / 403", async () => {
    authMock.mockResolvedValue(null);
    expect((await patch({ tourGroupId: "grp1" })).status).toBe(401);
    authMock.mockResolvedValue(makeSession());

    expect((await patch({})).status).toBe(400);
    expect((await patch({ tourGroupId: "grp1", status: "NOPE" })).status).toBe(400);
    expect((await patch({ tourGroupId: "grp1", name: "  " })).status).toBe(400);

    findManyMock.mockResolvedValue([]);
    expect((await patch({ tourGroupId: "grp1" })).status).toBe(404);

    findManyMock.mockResolvedValue(group() as never);
    isBandMemberMock.mockReturnValue(false);
    expect((await patch({ tourGroupId: "grp1" })).status).toBe(404);

    isBandMemberMock.mockReturnValue(true);
    canManageMock.mockReturnValue(false);
    expect((await patch({ tourGroupId: "grp1" })).status).toBe(403);
  });
});

describe("PATCH /api/shows/bulk — diffing", () => {
  it("does nothing and sends nothing when no field actually changed", async () => {
    findManyMock.mockResolvedValue(group() as never);
    const res = await patch(unchangedPayload);

    expect(await res.json()).toMatchObject({ changed: false });
    expect(updateManyMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it("re-titles every day in date order on a rename and announces it", async () => {
    findManyMock.mockResolvedValue(group() as never);
    const res = await patch({ ...unchangedPayload, name: "Winter Tour" });

    expect(await res.json()).toMatchObject({ changed: true });
    expect(updateMock).toHaveBeenCalledTimes(2);
    expect(updateMock.mock.calls[0][0]).toMatchObject({
      where: { id: "d1" },
      data: { title: "Winter Tour — Day 1", tourName: "Winter Tour" },
    });
    expect(updateMock.mock.calls[1][0].data.title).toBe("Winter Tour — Day 2");
    expect(notifyMock).toHaveBeenCalledWith(
      "band1",
      "u1",
      expect.objectContaining({
        title: "Tour updated: Winter Tour",
        body: "Renamed.",
        tag: "tour:grp1",
      })
    );
  });

  it("writes shared status once for the whole group with a readable summary", async () => {
    findManyMock.mockResolvedValue(group() as never);
    await patch({ ...unchangedPayload, status: "CONFIRMED" });

    expect(updateManyMock).toHaveBeenCalledWith({
      where: { tourGroupId: "grp1" },
      data: { status: "CONFIRMED" },
    });
    expect(notifyMock).toHaveBeenCalledWith(
      "band1",
      "u1",
      expect.objectContaining({ body: "Marked confirmed." })
    );
  });

  it("summarises multiple changes together", async () => {
    findManyMock.mockResolvedValue(group() as never);
    await patch({
      ...unchangedPayload,
      city: "Portland",
      notes: "Van rented",
    });
    expect(notifyMock).toHaveBeenCalledWith(
      "band1",
      "u1",
      expect.objectContaining({ body: "Location updated, notes updated." })
    );
  });
});
