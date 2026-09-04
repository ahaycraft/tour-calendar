import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { format } from "date-fns";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => {
  const prisma: Record<string, unknown> = {
    show: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    showAvailability: { deleteMany: vi.fn() },
  };
  // The [id] route always calls $transaction with a callback; run it against
  // the same mock so tx.show.update === prisma.show.update for assertions.
  prisma.$transaction = vi.fn(async (arg: unknown) =>
    typeof arg === "function"
      ? (arg as (tx: unknown) => unknown)(prisma)
      : Promise.all(arg as unknown[])
  );
  return { prisma };
});
vi.mock("@/lib/band", () => ({
  canManage: vi.fn(),
  isBandMember: vi.fn(),
}));
vi.mock("@/lib/push", () => ({ notifyBandMembers: vi.fn() }));

import { DELETE, PATCH } from "@/app/api/shows/[id]/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManage, isBandMember } from "@/lib/band";
import { notifyBandMembers } from "@/lib/push";
import { jsonRequest, makeSession, makeShow, routeCtx } from "@/test/factories";

// See the shows route test: cast next-auth / Prisma doubles to a plain Mock.
const authMock = auth as unknown as Mock;
const findUniqueMock = prisma.show.findUnique as unknown as Mock;
const updateMock = prisma.show.update as unknown as Mock;
const deleteMock = prisma.show.delete as unknown as Mock;
const deleteManyMock = prisma.showAvailability.deleteMany as unknown as Mock;
const isBandMemberMock = vi.mocked(isBandMember);
const canManageMock = vi.mocked(canManage);
const notifyMock = vi.mocked(notifyBandMembers);

const patch = (id: string, body: unknown) =>
  PATCH(jsonRequest(body) as Parameters<typeof PATCH>[0], routeCtx(id));
const del = (id: string) =>
  DELETE({} as Parameters<typeof DELETE>[0], routeCtx(id));

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue(makeSession());
  isBandMemberMock.mockReturnValue(true);
  canManageMock.mockReturnValue(true);
  // The updated row = existing merged with whatever the handler wrote.
  updateMock.mockImplementation(
    async (args: { data: Record<string, unknown> }) =>
      ({ ...currentExisting, ...args.data }) as never
  );
});

let currentExisting = makeShow();
function existing(show = makeShow()) {
  currentExisting = show;
  findUniqueMock.mockResolvedValue(show as never);
}

describe("PATCH /api/shows/[id] — guards", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await patch("s1", {})).status).toBe(401);
  });

  it("404 when the show doesn't exist", async () => {
    findUniqueMock.mockResolvedValue(null);
    expect((await patch("s1", {})).status).toBe(404);
  });

  it("404 when the caller isn't in the show's band", async () => {
    existing();
    isBandMemberMock.mockReturnValue(false);
    expect((await patch("s1", {})).status).toBe(404);
  });

  it("403 when the caller can't manage the show", async () => {
    existing();
    canManageMock.mockReturnValue(false);
    expect((await patch("s1", {})).status).toBe(403);
  });

  it("400 for an unknown event type", async () => {
    existing();
    const res = await patch("s1", { type: "TOUR" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid event type" });
  });
});

describe("PATCH /api/shows/[id] — date change", () => {
  it("wipes availability, reverts a confirmed show to pending, and sends the 'moved' push once", async () => {
    existing(
      makeShow({ status: "CONFIRMED", date: new Date("2026-06-15T00:00:00Z") })
    );
    const newDate = "2026-07-01T00:00:00Z";

    const res = await patch("show1", { date: newDate });
    const body = await res.json();

    expect(deleteManyMock).toHaveBeenCalledWith({ where: { showId: "show1" } });
    expect(updateMock.mock.calls[0][0].data).toMatchObject({ status: "PENDING" });
    expect(body).toMatchObject({ availabilityReset: true, statusReverted: true });

    expect(notifyMock).toHaveBeenCalledOnce();
    expect(notifyMock).toHaveBeenCalledWith("band1", "u1", {
      title: `The Roxy moved to ${format(new Date(newDate), "EEE, MMM d")}`,
      body: "Your availability was reset — tap to respond again.",
      url: "/shows/show1",
      tag: "show:show1",
    });
  });

  it("keeps the same date as a no-op (no wipe, no push)", async () => {
    existing(makeShow({ date: new Date("2026-06-15T00:00:00Z") }));
    const res = await patch("show1", { date: "2026-06-15T00:00:00Z" });
    expect(deleteManyMock).not.toHaveBeenCalled();
    expect(notifyMock).not.toHaveBeenCalled();
    expect(await res.json()).toMatchObject({ availabilityReset: false });
  });
});

describe("PATCH /api/shows/[id] — status → pending", () => {
  it("pushes 'set to pending' when a confirmed show is un-confirmed without moving it", async () => {
    existing(makeShow({ status: "CONFIRMED" }));
    const res = await patch("show1", { status: "PENDING" });

    expect(deleteManyMock).not.toHaveBeenCalled();
    expect(notifyMock).toHaveBeenCalledWith(
      "band1",
      "u1",
      expect.objectContaining({
        title: "The Roxy set to pending",
        tag: "show:show1",
      })
    );
    expect(await res.json()).toMatchObject({ statusReverted: false });
  });

  it("stays silent for an edit that doesn't move the date or reach pending", async () => {
    existing(makeShow({ status: "PENDING" }));
    await patch("show1", { notes: "Load in through the alley" });
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it("stays silent when confirming (pending → confirmed is not a pending transition)", async () => {
    existing(makeShow({ status: "PENDING" }));
    await patch("show1", { status: "CONFIRMED" });
    expect(notifyMock).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/shows/[id]", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await del("s1")).status).toBe(401);
  });

  it("404 when missing or out-of-band, 403 when unmanageable", async () => {
    findUniqueMock.mockResolvedValue(null);
    expect((await del("s1")).status).toBe(404);

    existing();
    isBandMemberMock.mockReturnValue(false);
    expect((await del("s1")).status).toBe(404);

    isBandMemberMock.mockReturnValue(true);
    canManageMock.mockReturnValue(false);
    expect((await del("s1")).status).toBe(403);
  });

  it("deletes the row and pushes with a distinct show-deleted:<id> tag", async () => {
    existing(makeShow({ id: "show1", date: new Date("2026-06-20T00:00:00Z") }));
    const res = await del("show1");

    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "show1" } });
    expect(await res.json()).toEqual({ success: true });
    expect(notifyMock).toHaveBeenCalledWith("band1", "u1", {
      title: "Show deleted: The Roxy",
      body: `${format(new Date("2026-06-20T00:00:00Z"), "EEE, MMM d")} is off the calendar.`,
      url: "/calendar",
      tag: "show-deleted:show1",
    });
  });

  it("labels a recording delete as 'Recording deleted:'", async () => {
    existing(makeShow({ type: "RECORDING", title: "LP2 Day 3" }));
    await del("show1");
    expect(notifyMock).toHaveBeenCalledWith(
      "band1",
      "u1",
      expect.objectContaining({ title: "Recording deleted: LP2 Day 3" })
    );
  });
});
