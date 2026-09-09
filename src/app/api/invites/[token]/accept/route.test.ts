import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => {
  const prisma: Record<string, unknown> = {
    bandInvite: { findUnique: vi.fn(), update: vi.fn() },
    bandMembership: { upsert: vi.fn() }
  };
  prisma.$transaction = vi.fn(async (ops: unknown[]) => Promise.all(ops));
  return { prisma };
});

import { POST } from "@/app/api/invites/[token]/accept/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { makeSession } from "@/test/factories";

const authMock = auth as unknown as Mock;
const findInviteMock = prisma.bandInvite.findUnique as unknown as Mock;
const upsertMembershipMock = prisma.bandMembership.upsert as unknown as Mock;

const accept = (token: string) =>
  POST({} as Parameters<typeof POST>[0], {
    params: Promise.resolve({ token })
  });

function validInvite(overrides = {}) {
  return {
    id: "inv1",
    token: "tok",
    bandId: "band1",
    role: "MEMBER",
    email: "member@example.com",
    acceptedAt: null,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    ...overrides
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Baseline "signed in" session; tests that care about the email override it.
  authMock.mockResolvedValue(makeSession({ userId: "u1" }));
});

describe("POST /api/invites/[token]/accept", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await accept("tok")).status).toBe(401);
  });

  it("404 when the token doesn't match any invite", async () => {
    findInviteMock.mockResolvedValue(null);
    authMock.mockResolvedValue({
      user: { id: "u1", email: "member@example.com" }
    });
    expect((await accept("bad-token")).status).toBe(404);
  });

  it("409 when the invite was already accepted", async () => {
    findInviteMock.mockResolvedValue(validInvite({ acceptedAt: new Date() }));
    authMock.mockResolvedValue({
      user: { id: "u1", email: "member@example.com" }
    });
    expect((await accept("tok")).status).toBe(409);
  });

  it("410 when the invite has expired", async () => {
    findInviteMock.mockResolvedValue(
      validInvite({ expiresAt: new Date(Date.now() - 1000) })
    );
    authMock.mockResolvedValue({
      user: { id: "u1", email: "member@example.com" }
    });
    expect((await accept("tok")).status).toBe(410);
  });

  it("403 when the signed-in email doesn't match who the invite was sent to", async () => {
    findInviteMock.mockResolvedValue(validInvite());
    authMock.mockResolvedValue({
      user: { id: "u1", email: "someone-else@example.com" }
    });
    const res = await accept("tok");
    expect(res.status).toBe(403);
    expect((await res.json()).error).toContain("member@example.com");
  });

  it("matches the invite email case-insensitively", async () => {
    findInviteMock.mockResolvedValue(validInvite());
    authMock.mockResolvedValue({
      user: { id: "u1", email: "MEMBER@Example.com" }
    });
    expect((await accept("tok")).status).toBe(200);
  });

  it("upserts membership, marks the invite accepted, and sets the active-band cookie", async () => {
    findInviteMock.mockResolvedValue(validInvite());
    authMock.mockResolvedValue({
      user: { id: "u1", email: "member@example.com" }
    });
    const res = await accept("tok");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, bandId: "band1" });
    expect(upsertMembershipMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { bandId_userId: { bandId: "band1", userId: "u1" } },
        create: { bandId: "band1", userId: "u1", role: "MEMBER" }
      })
    );
    expect(res.cookies.get("active_band")?.value).toBe("band1");
  });

  it("upsert doesn't clobber an existing membership's role (update: {})", async () => {
    findInviteMock.mockResolvedValue(validInvite());
    authMock.mockResolvedValue({
      user: { id: "u1", email: "member@example.com" }
    });
    await accept("tok");
    expect(upsertMembershipMock).toHaveBeenCalledWith(
      expect.objectContaining({ update: {} })
    );
  });
});
