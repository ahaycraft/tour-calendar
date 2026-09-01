import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const members = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      unavailableDates: {
        select: { date: true, note: true },
        orderBy: { date: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(members);
}
