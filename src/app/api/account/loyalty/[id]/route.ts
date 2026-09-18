import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { corsPreflight, withCors } from "@/lib/cors";

const SELECT = { id: true, type: true, program: true, memberNumber: true } as const;

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withCors(request, async () => {
    const session = await auth();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const existing = await prisma.loyaltyAccount.findUnique({ where: { id } });
    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { type, program, memberNumber } = await request.json();

    if (type !== undefined && type !== "HOTEL" && type !== "AIRLINE") {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
    if (program !== undefined && (typeof program !== "string" || !program.trim())) {
      return NextResponse.json({ error: "Program is required" }, { status: 400 });
    }
    if (
      memberNumber !== undefined &&
      (typeof memberNumber !== "string" || !memberNumber.trim())
    ) {
      return NextResponse.json({ error: "Member number is required" }, { status: 400 });
    }

    const account = await prisma.loyaltyAccount.update({
      where: { id },
      data: {
        ...(type !== undefined && { type }),
        ...(program !== undefined && { program: program.trim() }),
        ...(memberNumber !== undefined && { memberNumber: memberNumber.trim() })
      },
      select: SELECT
    });
    return NextResponse.json(account);
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withCors(request, async () => {
    const session = await auth();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const existing = await prisma.loyaltyAccount.findUnique({ where: { id } });
    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.loyaltyAccount.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  });
}
