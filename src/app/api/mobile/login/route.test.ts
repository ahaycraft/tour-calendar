import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn() }
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn() } }
}));
vi.mock("@/auth/mobile", () => ({
  mintMobileToken: vi.fn().mockResolvedValue("signed-token")
}));

import bcrypt from "bcryptjs";
import { POST } from "@/app/api/mobile/login/route";
import { prisma } from "@/lib/prisma";
import { mintMobileToken } from "@/auth/mobile";
import { jsonRequest } from "@/test/factories";

const login = (body: unknown) =>
  POST(jsonRequest(body) as Parameters<typeof POST>[0]);

const findUserMock = prisma.user.findUnique as unknown as Mock;
const compareMock = bcrypt.compare as unknown as Mock;
const mintMock = mintMobileToken as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  mintMock.mockResolvedValue("signed-token");
});

describe("POST /api/mobile/login", () => {
  it("400 when email or password is missing or not a string", async () => {
    expect((await login({ password: "x" })).status).toBe(400);
    expect((await login({ email: "a@b.com" })).status).toBe(400);
    expect((await login({ email: 5, password: "x" })).status).toBe(400);
    expect(findUserMock).not.toHaveBeenCalled();
  });

  it("401 when no user exists with that email", async () => {
    findUserMock.mockResolvedValue(null);
    const res = await login({ email: "nobody@example.com", password: "x" });
    expect(res.status).toBe(401);
    expect(mintMock).not.toHaveBeenCalled();
  });

  it("401 when the password doesn't match", async () => {
    findUserMock.mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      password: "hashed",
      role: "MEMBER"
    });
    compareMock.mockResolvedValue(false);
    const res = await login({ email: "a@b.com", password: "wrong" });
    expect(res.status).toBe(401);
    expect(mintMock).not.toHaveBeenCalled();
  });

  it("returns a token on valid credentials", async () => {
    findUserMock.mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      password: "hashed",
      role: "ADMIN"
    });
    compareMock.mockResolvedValue(true);
    const res = await login({ email: "a@b.com", password: "right" });
    expect(res.status).toBe(200);
    expect(mintMock).toHaveBeenCalledWith({ id: "u1", role: "ADMIN" });
    expect(await res.json()).toEqual({ token: "signed-token" });
  });
});
