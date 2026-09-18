import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isBandMember } from "@/lib/band";
import { corsPreflight, withCors } from "@/lib/cors";

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}

// Every member's saved loyalty accounts, for whoever's booking travel to
// copy from — open to any band member, same visibility as phone numbers
// (BandSettings' member list), not just owners/admins.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withCors(request, async () => {
    const session = await auth();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!isBandMember(session, id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const members = await prisma.user.findMany({
      where: { bandMemberships: { some: { bandId: id } } },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        loyaltyAccounts: {
          orderBy: { createdAt: "asc" },
          select: { id: true, type: true, program: true, memberNumber: true }
        }
      }
    });

    return NextResponse.json(
      members.map((m) => ({
        userId: m.id,
        name: m.name,
        accounts: m.loyaltyAccounts
      }))
    );
  });
}
