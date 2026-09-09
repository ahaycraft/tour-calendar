import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Update the signed-in user's own profile fields (currently just phone).
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { phone } = await request.json();
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

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { phone: cleaned },
    select: { id: true, phone: true }
  });
  return NextResponse.json(user);
}
