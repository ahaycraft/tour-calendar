import { NextRequest, NextResponse } from "next/server";
import { startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { sendPushToUsers } from "@/lib/push";

/**
 * Daily "you still have pending availability" nudge. Meant to be hit by a
 * scheduler (Vercel Cron, a GitHub Actions job, cron-job.org, ...) with
 *   Authorization: Bearer <CRON_SECRET>
 *
 * For every user who has at least one push subscription, counts upcoming,
 * non-cancelled shows across their bands that they haven't answered — the same
 * predicate as the nav badge in src/app/(protected)/layout.tsx — and pushes a
 * one-line summary when that count is > 0.
 */

async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const today = startOfDay(new Date());

  const users = await prisma.user.findMany({
    where: { pushSubscriptions: { some: {} } },
    select: {
      id: true,
      bandMemberships: { select: { bandId: true } },
    },
  });

  let notified = 0;

  for (const user of users) {
    const bandIds = user.bandMemberships.map((m) => m.bandId);
    if (bandIds.length === 0) continue;

    const pending = await prisma.show.count({
      where: {
        bandId: { in: bandIds },
        status: { not: "CANCELLED" },
        date: { gte: today },
        NOT: {
          availability: {
            some: {
              userId: user.id,
              status: { in: ["AVAILABLE", "UNAVAILABLE"] },
            },
          },
        },
      },
    });

    if (pending === 0) continue;

    await sendPushToUsers([user.id], {
      title:
        pending === 1
          ? "1 show needs your availability"
          : `${pending} shows need your availability`,
      body: "Open Woodshedd to let the band know if you're in or out.",
      url: "/my-availability",
      tag: "availability-reminder",
    });
    notified++;
  }

  return NextResponse.json({ users: users.length, notified });
}

// GET so Vercel Cron can call it; POST for schedulers that prefer it.
export const GET = handle;
export const POST = handle;
