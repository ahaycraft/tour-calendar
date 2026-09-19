import { NextRequest, NextResponse } from "next/server";
import { addDays, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { pushToStartLiveActivity } from "@/lib/apns";
import { buildShowActivityProps } from "@/lib/live-activity-content";

/**
 * Pushes today's SHOW-type events straight onto the Lock Screen / Dynamic
 * Island as a Live Activity, without needing the app open — see
 * woodshedd_mobile's src/widgets/upcoming-show-activity.tsx for the widget
 * itself. Meant to be hit once a day, early morning (Vercel Cron; see
 * vercel.json), with
 *   Authorization: Bearer <CRON_SECRET>
 * — same auth as the sibling /api/push/event-reminders.
 *
 * Every member of a band with a show today gets one push per registered
 * device (a user can have more than one). Best-effort per token: one
 * device's failure (a stale/unregistered token, most commonly) doesn't stop
 * the rest — matches sendPushToUsers' own contract in lib/push.ts.
 */
async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const todayStart = startOfDay(new Date());
  const tomorrowStart = addDays(todayStart, 1);

  const shows = await prisma.show.findMany({
    where: {
      type: "SHOW",
      status: { not: "CANCELLED" },
      date: { gte: todayStart, lt: tomorrowStart }
    },
    select: {
      id: true,
      title: true,
      date: true,
      venue: true,
      city: true,
      state: true,
      venueAddress: true,
      loadInTime: true,
      doorsTime: true,
      setTime: true,
      bandId: true
    }
  });

  let pushed = 0;

  for (const show of shows) {
    const members = await prisma.bandMembership.findMany({
      where: { bandId: show.bandId },
      select: { userId: true }
    });
    if (members.length === 0) continue;

    const tokens = await prisma.liveActivityToken.findMany({
      where: { userId: { in: members.map((m) => m.userId) } },
      select: { token: true }
    });
    if (tokens.length === 0) continue;

    const props = buildShowActivityProps(show);
    const results = await Promise.allSettled(
      tokens.map((t) =>
        pushToStartLiveActivity(t.token, { name: "UpcomingShowActivity", props })
      )
    );
    pushed += results.filter((r) => r.status === "fulfilled" && r.value).length;
  }

  return NextResponse.json({ shows: shows.length, pushed });
}

// GET so Vercel Cron can call it; POST for schedulers that prefer it.
export const GET = handle;
export const POST = handle;
