/** Human-readable label for a band role, for display in UI. Kept in its own
    module (no server-only imports) so client components can use it too. */
export function roleLabel(role: string): string {
  switch (role) {
    case "TOUR_MANAGER":
      return "Tour Manager";
    case "BOOKING_AGENT":
      return "Booking Agent";
    default:
      return role.charAt(0) + role.slice(1).toLowerCase();
  }
}
