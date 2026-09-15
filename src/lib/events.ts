import { startOfDay, subDays } from "date-fns";
import { calendarDate } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

/**
 * Upcoming = happening today or later, and not cancelled. This is the split
 * used on the Shows / Practices / Recordings lists and by the bulk calendar
 * export.
 */
export function isUpcomingEvent(e: {
  date: Date | string;
  status: string;
}): boolean {
  return (
    e.status !== "CANCELLED" &&
    startOfDay(calendarDate(e.date)).getTime() >=
      startOfDay(new Date()).getTime()
  );
}

/** How far back the Shows / Practices / Recordings list pages show past
 *  events. Older ones stay reachable on the calendar (which loads by visible
 *  range), but drop off the lists so a long-running band's query doesn't
 *  grow without bound. */
export const LIST_PAST_DAYS = 90;

export function listSince(): Date {
  return subDays(startOfDay(new Date()), LIST_PAST_DAYS);
}

/** Upcoming, non-cancelled shows in `bandId` that `userId` hasn't responded
 *  to yet. Whether an admin has confirmed the show is a separate concern and
 *  deliberately not counted here. Shared by the nav badges and the My
 *  Availability tabs so they never disagree. */
export async function needsResponseCount(
  bandId: string,
  userId: string
): Promise<number> {
  return prisma.show.count({
    where: {
      bandId,
      status: { not: "CANCELLED" },
      date: { gte: startOfDay(new Date()) },
      NOT: {
        availability: {
          some: { userId, status: { in: ["AVAILABLE", "UNAVAILABLE"] } }
        }
      }
    }
  });
}

export type EventTypeStr = "SHOW" | "RECORDING" | "PRACTICE";

/**
 * The three event types are one Prisma model (`Show`) discriminated by `type`,
 * each with its own list route and its own vocabulary. These maps are the one
 * place that vocabulary lives; components take `type` and look the words up
 * rather than branching on it.
 */
const BASE_PATH: Record<string, "/shows" | "/recordings" | "/practices"> = {
  SHOW: "/shows",
  RECORDING: "/recordings",
  PRACTICE: "/practices"
};
const NOUN: Record<string, string> = {
  SHOW: "show",
  RECORDING: "session",
  PRACTICE: "practice"
};
const NOUN_PLURAL: Record<string, string> = {
  SHOW: "shows",
  RECORDING: "sessions",
  PRACTICE: "practices"
};
/** Singular label for the type itself (badge, "Add …" buttons). */
const TYPE_LABEL: Record<string, string> = {
  SHOW: "Show",
  RECORDING: "Recording",
  PRACTICE: "Practice"
};
/** Plural label for list pages and nav. */
const LIST_LABEL: Record<string, string> = {
  SHOW: "Shows",
  RECORDING: "Recordings",
  PRACTICE: "Practices"
};

export const EVENT_TYPES: EventTypeStr[] = ["SHOW", "RECORDING", "PRACTICE"];

export function isEventType(value: unknown): value is EventTypeStr {
  return value === "SHOW" || value === "RECORDING" || value === "PRACTICE";
}

export function eventBasePath(
  type: string
): "/shows" | "/recordings" | "/practices" {
  return BASE_PATH[type] ?? "/shows";
}
export function eventNoun(type: string): string {
  return NOUN[type] ?? "show";
}
export function eventNounPlural(type: string): string {
  return NOUN_PLURAL[type] ?? "shows";
}
export function eventTypeLabel(type: string): string {
  return TYPE_LABEL[type] ?? type;
}
export function eventListLabel(type: string): string {
  return LIST_LABEL[type] ?? "Shows";
}

export function eventHref(type: string, id: string): string {
  return `${eventBasePath(type)}/${id}`;
}

/** Edit page for a whole tour / recording block, keyed by its shared group id. */
export function tourEditHref(type: string, tourGroupId: string): string {
  return `${eventBasePath(type)}/tour/${tourGroupId}/edit`;
}
