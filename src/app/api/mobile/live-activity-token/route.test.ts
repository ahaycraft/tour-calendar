import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { liveActivityToken: { upsert: vi.fn(), deleteMany: vi.fn() } }
}));

import { POST, DELETE } from "@/app/api/mobile/live-activity-token/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { jsonRequest, makeSession } from "@/test/factories";

const authMock = auth as unknown as Mock;
const upsertMock = prisma.liveActivityToken.upsert as unknown as Mock;
const deleteManyMock = prisma.liveActivityToken.deleteMany as unknown as Mock;

const post = (body: unknown) => POST(jsonRequest(body) as Parameters<typeof POST>[0]);
const del = (body: unknown) => DELETE(jsonRequest(body) as Parameters<typeof DELETE>[0]);

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue(makeSession({ userId: "u1" }));
});

describe("POST /api/mobile/live-activity-token", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await post({ token: "abc" })).status).toBe(401);
  });

  it("400 for a missing/empty token", async () => {
    expect((await post({})).status).toBe(400);
    expect((await post({ token: "" })).status).toBe(400);
    expect((await post({ token: 123 })).status).toBe(400);
  });

  it("upserts the token, keyed by the token itself, assigned to the caller", async () => {
    const res = await post({ token: "ptst-token" });
    expect(res.status).toBe(201);
    expect(upsertMock).toHaveBeenCalledWith({
      where: { token: "ptst-token" },
      create: { token: "ptst-token", userId: "u1" },
      update: { userId: "u1" }
    });
  });
});

describe("DELETE /api/mobile/live-activity-token", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await del({ token: "abc" })).status).toBe(401);
  });

  it("400 when token is missing", async () => {
    expect((await del({})).status).toBe(400);
  });

  it("only deletes the caller's own token", async () => {
    const res = await del({ token: "ptst-token" });
    expect(res.status).toBe(200);
    expect(deleteManyMock).toHaveBeenCalledWith({
      where: { token: "ptst-token", userId: "u1" }
    });
  });
});
