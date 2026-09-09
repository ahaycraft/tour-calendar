import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Global-admin only — toggles the "contacted" checkbox at /admin/interest.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  if (typeof body.contacted !== "boolean") {
    return NextResponse.json(
      { error: "contacted must be a boolean" },
      { status: 400 }
    );
  }

  try {
    const submission = await prisma.interestSubmission.update({
      where: { id },
      data: { contactedAt: body.contacted ? new Date() : null }
    });
    return NextResponse.json(submission);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
