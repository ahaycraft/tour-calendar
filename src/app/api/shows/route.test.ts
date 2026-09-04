import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    show: { create: vi.fn(), findMany: vi.fn() },
    release: { findFirst: vi.fn() },
  },
}));
vi.mock("@/lib/band", () => ({ getActiveBandId: vi.fn() }));
vi.mock("@/lib/push", () => ({ notifyBandMembers: vi.fn() }));

import { POST } from "@/app/api/shows/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getActiveBandId } from "@/lib/band";
import { notifyBandMembers } from "@/lib/push";
import { jsonRequest, makeSession } from "@/test/factories";

// `auth` is an overloaded next-auth export and Prisma's delegate signatures are
// deeply generic; cast the doubles to a plain Mock so `.mockResolvedValue` etc.
// don't fight those types.
const authMock = auth as unknown as Mock;
const createMock = prisma.show.create as unknown as Mock;
const releaseFindMock = prisma.release.findFirst as unknown as Mock;
const getActiveBandIdMock = vi.mocked(getActiveBandId);
const notifyMock = vi.mocked(notifyBandMembers);

const call = (body: unknown) =>
  POST(jsonRequest(body) as Parameters<typeof POST>[0]);

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue(makeSession());
  getActiveBandIdMock.mockResolvedValue("band1");
  // Echo back an id so the handler can build hrefs / tags.
  createMock.mockImplementation(
    async (args: { data: { title: string; type: string } }) =>
      ({ id: "new1", title: args.data.title, type: args.data.type }) as never
  );
});

describe("POST /api/shows — guards", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    const res = await call({ title: "x", date: "2026-06-15" });
    expect(res.status).toBe(401);
  });

  it("400 when title or date is missing", async () => {
    expect((await call({ title: "x" })).status).toBe(400);
    expect((await call({ date: "2026-06-15" })).status).toBe(400);
  });

  it("400 for an unknown event type", async () => {
    const res = await call({ title: "x", date: "2026-06-15", type: "TOUR" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid event type" });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("400 when the user has no active band", async () => {
    getActiveBandIdMock.mockResolvedValue(null);
    const res = await call({ title: "x", date: "2026-06-15" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "No band selected" });
  });
});

describe("POST /api/shows — create + notify", () => {
  it("creates a SHOW and notifies the band with a show:<id> tag", async () => {
    const res = await call({ title: "The Roxy", date: "2026-06-15T00:00:00Z" });

    expect(res.status).toBe(201);
    expect(createMock).toHaveBeenCalledOnce();
    const data = createMock.mock.calls[0][0].data;
    expect(data).toMatchObject({
      bandId: "band1",
      type: "SHOW",
      title: "The Roxy",
      createdById: "u1",
    });
    expect(data.date).toBeInstanceOf(Date);

    expect(notifyMock).toHaveBeenCalledWith("band1", "u1", {
      title: "New show: The Roxy",
      body: "Tap to set your availability.",
      url: "/shows/new1",
      tag: "show:new1",
    });
  });

  it("uses the practice vocabulary and route for a PRACTICE", async () => {
    await call({ title: "Thursday run", date: "2026-06-15", type: "PRACTICE" });
    expect(notifyMock).toHaveBeenCalledWith(
      "band1",
      "u1",
      expect.objectContaining({
        title: "New practice: Thursday run",
        url: "/practices/new1",
      })
    );
  });

  it("rejects a RECORDING whose releaseId isn't in the band", async () => {
    releaseFindMock.mockResolvedValue(null);
    const res = await call({
      title: "Tracking",
      date: "2026-06-15",
      type: "RECORDING",
      releaseId: "rel-x",
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Release not found" });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("links a valid release on a RECORDING", async () => {
    releaseFindMock.mockResolvedValue({ id: "rel1" } as never);
    await call({
      title: "Tracking",
      date: "2026-06-15",
      type: "RECORDING",
      releaseId: "rel1",
    });
    expect(createMock.mock.calls[0][0].data).toMatchObject({ releaseId: "rel1" });
  });

  it("500s if the create throws, without surfacing internals", async () => {
    createMock.mockRejectedValue(new Error("db down"));
    const res = await call({ title: "x", date: "2026-06-15" });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal server error" });
  });
});
