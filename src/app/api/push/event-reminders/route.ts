import { NextRequest, NextResponse } from "next/server";
import { addDays, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { sendPushToUsers } from "@/lib/push";
import { eventHref, eventTypeLabel } from "@/lib/events";

/**
 * "Tomorrow" reminder for every show, practice, and recording session. Meant
 * to be hit by a daily scheduler (Vercel Cron, a GitHub Actions job,
 * cron-job.org, ...) with
 *   Authorization: Bearer <CRON_SECRET>
 * — see /api/push/remind for the sibling "pending availability" nudge.
 *
 * Finds every non-cancelled event dated tomorrow that hasn't been reminded
 * yet, pushes every member of that event's band regardless of their
 * availability response, and stamps `remindedAt` so an event is only ever
 * reminded once, even if the cron fires more than once in the window.
 */
async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const tomorrowStart = startOfDay(addDays(new Date(), 1));
  const dayAfterStart = addDays(tomorrowStart, 1);

  const events = await prisma.show.findMany({
    where: {
      status: { not: "CANCELLED" },
      date: { gte: tomorrowStart, lt: dayAfterStart },
      remindedAt: null,
    },
    select: {
      id: true,
      type: true,
      title: true,
      venue: true,
      city: true,
      bandId: true,
    },
  });

  let notified = 0;

  for (const event of events) {
    const members = await prisma.bandMembership.findMany({
      where: { bandId: event.bandId },
      select: { userId: true },
    });
    const userIds = members.map((m) => m.userId);

    if (userIds.length > 0) {
      const location = [event.venue, event.city].filter(Boolean).join(", ");

      await sendPushToUsers(userIds, {
        title: `${eventTypeLabel(event.type)} tomorrow: ${event.title}`,
        body: location || "Details are in Woodshed.",
        url: eventHref(event.type, event.id),
        tag: `event-reminder-${event.id}`,
      });
      notified++;
    }

    await prisma.show.update({
      where: { id: event.id },
      data: { remindedAt: new Date() },
    });
  }

  return NextResponse.json({ events: events.length, notified });
}

// GET so Vercel Cron can call it; POST for schedulers that prefer it.
export const GET = handle;
export const POST = handle;
