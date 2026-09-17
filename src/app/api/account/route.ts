import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { corsPreflight, withCors } from "@/lib/cors";

// A fixed, unreachable-by-login placeholder that a deleted user's
// band-shared content (shows, songs, releases, ...) is reassigned to
// before the real row is removed — so band history survives even though
// the person who created it is gone, the same way "deleted user" shows
// up as the author of old messages in Slack/Discord. It's never a band
// member and never signs in, so it never appears anywhere a real member
// would (member lists, invites, availability, etc).
const DELETED_USER_EMAIL = "deleted-user@system.internal";

async function getOrCreateDeletedUserPlaceholder() {
  return prisma.user.upsert({
    where: { email: DELETED_USER_EMAIL },
    update: {},
    create: {
      name: "Deleted user",
      email: DELETED_USER_EMAIL,
      // Never actually used to sign in (this address doesn't go through
      // the invite/signup flow), hashed anyway so the column holds the
      // same shape as every real row's.
      password: await bcrypt.hash(randomUUID(), 10)
    }
  });
}

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request);
}

// Update the signed-in user's own profile fields (name, phone).
export async function PATCH(request: NextRequest) {
  return withCors(request, async () => {
    const session = await auth();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const data: { name?: string; phone?: string | null } = {};

    if ("name" in body) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json({ error: "Enter a name" }, { status: 400 });
      }
      data.name = body.name.trim();
    }

    if ("phone" in body) {
      const { phone } = body;
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
      data.phone = cleaned;
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: { id: true, name: true, phone: true }
    });
    return NextResponse.json(user);
  });
}

// Permanently delete the signed-in user's account (Apple App Store
// guideline 5.1.1(v) requires this be reachable from within the app for
// any app that supports account creation). Content they created for a
// band (shows, songs, releases, ...) isn't deleted with them — it's
// reassigned to a placeholder "Deleted user" account first, so a former
// member's contributions don't vanish out from under their old band.
export async function DELETE(request: NextRequest) {
  return withCors(request, async () => {
    const session = await auth();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;

    // Same rule already enforced when leaving a band (see
    // src/app/api/bands/[id]/members/[userId]/route.ts) — a group needs
    // an owner, so the last one out has to hand off ownership first.
    const ownedMemberships = await prisma.bandMembership.findMany({
      where: { userId, role: "OWNER" },
      select: { bandId: true, band: { select: { name: true } } }
    });
    for (const { bandId, band } of ownedMemberships) {
      const ownerCount = await prisma.bandMembership.count({
        where: { bandId, role: "OWNER" }
      });
      if (ownerCount <= 1) {
        return NextResponse.json(
          {
            error: `Transfer ownership of "${band.name}" before deleting your account — a group needs an owner`
          },
          { status: 400 }
        );
      }
    }

    const placeholder = await getOrCreateDeletedUserPlaceholder();

    await prisma.$transaction([
      prisma.show.updateMany({
        where: { createdById: userId },
        data: { createdById: placeholder.id }
      }),
      prisma.song.updateMany({
        where: { createdById: userId },
        data: { createdById: placeholder.id }
      }),
      prisma.song.updateMany({
        where: { updatedById: userId },
        data: { updatedById: placeholder.id }
      }),
      prisma.release.updateMany({
        where: { createdById: userId },
        data: { createdById: placeholder.id }
      }),
      prisma.recordingPlan.updateMany({
        where: { createdById: userId },
        data: { createdById: placeholder.id }
      }),
      prisma.songDemo.updateMany({
        where: { createdById: userId },
        data: { createdById: placeholder.id }
      }),
      prisma.recordingPart.updateMany({
        where: { assigneeId: userId },
        data: { assigneeId: placeholder.id }
      }),
      prisma.bandInvite.updateMany({
        where: { invitedById: userId },
        data: { invitedById: placeholder.id }
      }),
      // Everything else personal to this user — sessions, OAuth accounts,
      // push subscriptions/tokens, availability, band memberships, song
      // comments — cascades automatically via each relation's
      // `onDelete: Cascade`.
      prisma.user.delete({ where: { id: userId } })
    ]);

    return NextResponse.json({ ok: true });
  });
}
