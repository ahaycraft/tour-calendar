import { startOfDay } from "date-fns";

/**
 * Upcoming = happening today or later, and not cancelled. This is the split
 * used on the Shows / Recordings lists and by the bulk calendar export.
 */
export function isUpcomingEvent(e: {
  date: Date | string;
  status: string;
}): boolean {
  return (
    e.status !== "CANCELLED" &&
    startOfDay(new Date(e.date)).getTime() >= startOfDay(new Date()).getTime()
  );
}

/** Shows and recordings share one model but live under separate routes. */
export function eventBasePath(type: string): "/shows" | "/recordings" {
  return type === "RECORDING" ? "/recordings" : "/shows";
}

export function eventHref(type: string, id: string): string {
  return `${eventBasePath(type)}/${id}`;
}

/** Edit page for a whole tour / recording block, keyed by its shared group id. */
export function tourEditHref(type: string, tourGroupId: string): string {
  return `${eventBasePath(type)}/tour/${tourGroupId}/edit`;
}
