import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { corsPreflight, withCors } from "@/lib/cors";

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}

// Update the signed-in user's own profile fields (name, phone).
export async function PATCH(request: NextRequest) {
  return withCors(request, async () => {
    const session = await auth();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const data: { name?: string; phone?: string | null } = {};

    if ("name" in body) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json({ error: "Enter a name" }, { status: 400 });
      }
      data.name = body.name.trim();
    }

    if ("phone" in body) {
      const { phone } = body;
      if (phone !== null && typeof phone !== "string") {
        return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
      }
      const cleaned = phone?.trim() || null;
      if (cleaned && !/^\+?[0-9()\-.\s]{7,20}$/.test(cleaned)) {
        return NextResponse.json(
          { error: "That doesn't look like a valid phone number" },
          { status: 400 }
        );
      }
      data.phone = cleaned;
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: { id: true, name: true, phone: true }
    });
    return NextResponse.json(user);
  });
}
