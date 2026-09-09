import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed-password") }
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn() },
    bandInvite: { findUnique: vi.fn(), update: vi.fn() },
    band: { findUnique: vi.fn() }
  }
}));

import { POST } from "@/app/api/register/route";
import { prisma } from "@/lib/prisma";
import { jsonRequest } from "@/test/factories";

const register = (body: unknown) =>
  POST(jsonRequest(body) as Parameters<typeof POST>[0]);

const findUserMock = prisma.user.findUnique as unknown as Mock;
const createUserMock = prisma.user.create as unknown as Mock;
const findInviteMock = prisma.bandInvite.findUnique as unknown as Mock;
const updateInviteMock = prisma.bandInvite.update as unknown as Mock;
const findBandMock = prisma.band.findUnique as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  findUserMock.mockResolvedValue(null); // email not already in use
  findBandMock.mockResolvedValue(null); // slug is free on the first try
  createUserMock.mockResolvedValue({
    id: "u1",
    name: "New User",
    email: "new@example.com"
  });
});

describe("POST /api/register — validation", () => {
  it("400 when name, email, or password is missing", async () => {
    expect(
      (await register({ email: "a@b.com", password: "x" })).status
    ).toBe(400);
    expect((await register({ name: "A", password: "x" })).status).toBe(400);
    expect((await register({ name: "A", email: "a@b.com" })).status).toBe(
      400
    );
    expect(createUserMock).not.toHaveBeenCalled();
  });

  it("409 when the email is already registered", async () => {
    findUserMock.mockResolvedValue({ id: "existing" });
    const res = await register({
      name: "A",
      email: "taken@example.com",
      password: "x",
      bandName: "My Band"
    });
    expect(res.status).toBe(409);
    expect(createUserMock).not.toHaveBeenCalled();
  });

  it("500 on an unexpected error", async () => {
    createUserMock.mockRejectedValue(new Error("db exploded"));
    const res = await register({
      name: "A",
      email: "a@example.com",
      password: "x",
      bandName: "My Band"
    });
    expect(res.status).toBe(500);
  });
});

describe("POST /api/register — starting a fresh band", () => {
  it("400 when bandName is missing or blank", async () => {
    expect(
      (await register({ name: "A", email: "a@example.com", password: "x" }))
        .status
    ).toBe(400);
    expect(
      (
        await register({
          name: "A",
          email: "a@example.com",
          password: "x",
          bandName: "   "
        })
      ).status
    ).toBe(400);
  });

  it("creates the user as OWNER of a newly created band, with the password hashed", async () => {
    const res = await register({
      name: "A",
      email: "A@Example.com",
      password: "plaintext",
      bandName: "The Sound City Players"
    });
    expect(res.status).toBe(201);
    expect(createUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "A",
          email: "a@example.com", // normalized (trimmed/lowercased)
          password: "hashed-password",
          bandMemberships: {
            create: {
              role: "OWNER",
              band: {
                create: expect.objectContaining({
                  name: "The Sound City Players"
                })
              }
            }
          }
        })
      })
    );
  });
});

describe("POST /api/register — joining via an invite", () => {
  function validInvite(overrides = {}) {
    return {
      id: "inv1",
      token: "tok",
      email: "invited@example.com",
      bandId: "band1",
      role: "MEMBER",
      acceptedAt: null,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      ...overrides
    };
  }

  it("400 when the invite doesn't exist", async () => {
    findInviteMock.mockResolvedValue(null);
    const res = await register({
      name: "A",
      email: "invited@example.com",
      password: "x",
      inviteToken: "bad-token"
    });
    expect(res.status).toBe(400);
    expect(createUserMock).not.toHaveBeenCalled();
  });

  it("400 when the invite was already accepted", async () => {
    findInviteMock.mockResolvedValue(validInvite({ acceptedAt: new Date() }));
    const res = await register({
      name: "A",
      email: "invited@example.com",
      password: "x",
      inviteToken: "tok"
    });
    expect(res.status).toBe(400);
  });

  it("400 when the invite has expired", async () => {
    findInviteMock.mockResolvedValue(
      validInvite({ expiresAt: new Date(Date.now() - 1000) })
    );
    const res = await register({
      name: "A",
      email: "invited@example.com",
      password: "x",
      inviteToken: "tok"
    });
    expect(res.status).toBe(400);
  });

  it("400 when the email doesn't match who the invite was sent to", async () => {
    findInviteMock.mockResolvedValue(validInvite());
    const res = await register({
      name: "A",
      email: "someone-else@example.com",
      password: "x",
      inviteToken: "tok"
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("invited@example.com");
  });

  it("creates the user with the invite's band/role and marks the invite accepted", async () => {
    findInviteMock.mockResolvedValue(validInvite());
    const res = await register({
      name: "A",
      email: "Invited@Example.com",
      password: "x",
      inviteToken: "tok"
    });
    expect(res.status).toBe(201);
    expect(createUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bandMemberships: { create: { bandId: "band1", role: "MEMBER" } }
        })
      })
    );
    expect(updateInviteMock).toHaveBeenCalledWith({
      where: { id: "inv1" },
      data: { acceptedAt: expect.any(Date) }
    });
  });
});
