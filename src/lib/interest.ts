export const INTEREST_ROLES = [
  "ARTIST",
  "BAND",
  "PRODUCER",
  "MANAGER",
  "BOOKING_AGENT",
] as const;

export type InterestRoleStr = (typeof INTEREST_ROLES)[number];

export const interestRoleLabel: Record<InterestRoleStr, string> = {
  ARTIST: "Artist",
  BAND: "Band",
  PRODUCER: "Producer",
  MANAGER: "Manager",
  BOOKING_AGENT: "Booking Agent",
};

export function isInterestRole(v: unknown): v is InterestRoleStr {
  return typeof v === "string" && (INTEREST_ROLES as readonly string[]).includes(v);
}
