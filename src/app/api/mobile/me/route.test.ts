import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { GET } from "@/app/api/mobile/me/route";
import { auth } from "@/auth";

const authMock = auth as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/mobile/me", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the caller's id, name, email, and role", async () => {
    authMock.mockResolvedValue({
      user: {
        id: "u1",
        name: "Jordan Lee",
        email: "jordan@example.com",
        role: "ADMIN",
        bands: []
      }
    });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      id: "u1",
      name: "Jordan Lee",
      email: "jordan@example.com",
      role: "ADMIN"
    });
  });
});
