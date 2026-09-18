import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { corsPreflight, withCors } from "@/lib/cors";

const SELECT = { id: true, type: true, program: true, memberNumber: true } as const;

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}

// The signed-in user's own loyalty accounts — see the schema comment on
// LoyaltyAccount for why this is personal rather than band-scoped.
export async function GET(request: NextRequest) {
  return withCors(request, async () => {
    const session = await auth();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const accounts = await prisma.loyaltyAccount.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
      select: SELECT
    });
    return NextResponse.json(accounts);
  });
}

export async function POST(request: NextRequest) {
  return withCors(request, async () => {
    const session = await auth();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { type, program, memberNumber } = await request.json();

    if (type !== "HOTEL" && type !== "AIRLINE") {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
    if (typeof program !== "string" || !program.trim()) {
      return NextResponse.json({ error: "Program is required" }, { status: 400 });
    }
    if (typeof memberNumber !== "string" || !memberNumber.trim()) {
      return NextResponse.json({ error: "Member number is required" }, { status: 400 });
    }

    const account = await prisma.loyaltyAccount.create({
      data: {
        userId: session.user.id,
        type,
        program: program.trim(),
        memberNumber: memberNumber.trim()
      },
      select: SELECT
    });
    return NextResponse.json(account, { status: 201 });
  });
}
