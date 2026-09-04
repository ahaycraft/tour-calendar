import { startOfDay } from "date-fns";

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
    startOfDay(new Date(e.date)).getTime() >= startOfDay(new Date()).getTime()
  );
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
  PRACTICE: "/practices",
};
const NOUN: Record<string, string> = {
  SHOW: "show",
  RECORDING: "session",
  PRACTICE: "practice",
};
const NOUN_PLURAL: Record<string, string> = {
  SHOW: "shows",
  RECORDING: "sessions",
  PRACTICE: "practices",
};
/** Singular label for the type itself (badge, "Add …" buttons). */
const TYPE_LABEL: Record<string, string> = {
  SHOW: "Show",
  RECORDING: "Recording",
  PRACTICE: "Practice",
};
/** Plural label for list pages and nav. */
const LIST_LABEL: Record<string, string> = {
  SHOW: "Shows",
  RECORDING: "Recordings",
  PRACTICE: "Practices",
};

export const EVENT_TYPES: EventTypeStr[] = ["SHOW", "RECORDING", "PRACTICE"];

export function isEventType(value: unknown): value is EventTypeStr {
  return (
    value === "SHOW" || value === "RECORDING" || value === "PRACTICE"
  );
}

export function eventBasePath(type: string): "/shows" | "/recordings" | "/practices" {
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
