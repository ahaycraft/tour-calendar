import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getActiveBandId } from "@/lib/band";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bandId = await getActiveBandId(session);
  if (!bandId) return NextResponse.json([]);

  const memberships = await prisma.bandMembership.findMany({
    where: { bandId },
    orderBy: { user: { name: "asc" } },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          unavailableDates: {
            select: { date: true, note: true },
            orderBy: { date: "asc" },
          },
        },
      },
    },
  });

  return NextResponse.json(
    memberships.map((m) => ({ ...m.user, role: m.role }))
  );
}
