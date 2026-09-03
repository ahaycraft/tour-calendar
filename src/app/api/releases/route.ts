import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isReleaseKind } from "@/lib/releases";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { title, kind } = await request.json();
    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "A title is required" }, { status: 400 });
    }
    if (kind !== undefined && !isReleaseKind(kind)) {
      return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
    }

    const release = await prisma.release.create({
      data: {
        title: title.trim(),
        kind: kind ?? "ALBUM",
        createdById: session.user.id,
      },
      select: { id: true },
    });

    return NextResponse.json(release, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
