import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { corsPreflight, withCors } from "@/lib/cors";

// Stores/removes the caller's ActivityKit push-to-start token — the Live
// Activity equivalent of /api/mobile/push-token's Expo push token. One row
// per device; keyed by the token itself so re-registering is idempotent.
// See src/lib/apns.ts for what actually sends to it.

export async function POST(request: NextRequest) {
  return withCors(request, async () => {
    const session = await auth();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
      const body = await request.json();
      const token: unknown = body?.token;

      if (typeof token !== "string" || !token) {
        return NextResponse.json(
          { error: "Invalid push-to-start token" },
          { status: 400 }
        );
      }

      await prisma.liveActivityToken.upsert({
        where: { token },
        create: { token, userId: session.user.id },
        // Token reused on another account (shared device, or a fresh
        // reinstall signed into someone else) — reassign it.
        update: { userId: session.user.id }
      });

      return NextResponse.json({ success: true }, { status: 201 });
    } catch {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(request: NextRequest) {
  return withCors(request, async () => {
    const session = await auth();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
      const { token } = await request.json();
      if (typeof token !== "string") {
        return NextResponse.json(
          { error: "Token is required" },
          { status: 400 }
        );
      }

      // Scoped to the caller so one user can't delete another's token.
      await prisma.liveActivityToken.deleteMany({
        where: { token, userId: session.user.id }
      });

      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}
