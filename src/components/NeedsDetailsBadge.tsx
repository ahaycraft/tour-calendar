/** An event is incomplete while it has no venue or no city booked yet. */
export function needsDetails(event: {
  venue: string | null;
  city: string | null;
}): boolean {
  return !event.venue || !event.city;
}

/** "The Roxy · Los Angeles, CA", degrading gracefully while fields are blank. */
export function locationLine(event: {
  venue: string | null;
  city: string | null;
  state: string | null;
}): string {
  const place = [event.city, event.state].filter(Boolean).join(", ");
  return [event.venue ?? "Venue TBA", place || "Location TBA"].join(" · ");
}

export default function NeedsDetailsBadge() {
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
      Needs details
    </span>
  );
}
