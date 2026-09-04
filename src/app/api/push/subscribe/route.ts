import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Stores/removes the caller's Web Push subscription. One row per browser+device;
// keyed by the push `endpoint` so re-subscribing is idempotent.

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const sub = await request.json();
    const endpoint: unknown = sub?.endpoint;
    const p256dh: unknown = sub?.keys?.p256dh;
    const auth256: unknown = sub?.keys?.auth;

    if (
      typeof endpoint !== "string" ||
      typeof p256dh !== "string" ||
      typeof auth256 !== "string"
    ) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        endpoint,
        p256dh,
        auth: auth256,
        userId: session.user.id,
        userAgent: request.headers.get("user-agent") ?? undefined,
      },
      // Endpoint reused on another account (shared device) — reassign it.
      update: { userId: session.user.id, p256dh, auth: auth256 },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { endpoint } = await request.json();
    if (typeof endpoint !== "string") {
      return NextResponse.json({ error: "Endpoint is required" }, { status: 400 });
    }

    // Scoped to the caller so one user can't delete another's subscription.
    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
