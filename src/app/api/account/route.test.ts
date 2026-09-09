import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { update: vi.fn() } }
}));

import { PATCH } from "@/app/api/account/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { jsonRequest, makeSession } from "@/test/factories";

const authMock = auth as unknown as Mock;
const updateMock = prisma.user.update as unknown as Mock;

const patch = (body: unknown) =>
  PATCH(jsonRequest(body) as Parameters<typeof PATCH>[0]);

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue(makeSession());
  updateMock.mockImplementation(
    async (args: { data: { phone: string | null } }) =>
      ({ id: "u1", phone: args.data.phone }) as never
  );
});

describe("PATCH /api/account", () => {
  it("401 without a session", async () => {
    authMock.mockResolvedValue(null);
    expect((await patch({ phone: "2178885757" })).status).toBe(401);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("400 when phone is neither a string nor null", async () => {
    expect((await patch({ phone: 2178885757 })).status).toBe(400);
    expect((await patch({ phone: {} })).status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("400 for a string that doesn't look like a phone number", async () => {
    const res = await patch({ phone: "not a phone" });
    expect(res.status).toBe(400);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("saves a trimmed, validly-formatted phone number for the caller", async () => {
    const res = await patch({ phone: " +1 (217) 888-5757 " });
    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { phone: "+1 (217) 888-5757" },
      select: { id: true, phone: true }
    });
    expect(await res.json()).toEqual({ id: "u1", phone: "+1 (217) 888-5757" });
  });

  it("clears the phone number when given an empty/whitespace string", async () => {
    const res = await patch({ phone: "   " });
    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: { phone: null } })
    );
  });

  it("clears the phone number when given null", async () => {
    const res = await patch({ phone: null });
    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: { phone: null } })
    );
  });

  it("scopes the update to the signed-in user, not an arbitrary id", async () => {
    authMock.mockResolvedValue(makeSession({ userId: "someone-else" }));
    await patch({ phone: "2178885757" });
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "someone-else" } })
    );
  });
});
