import { formatDate, formatTime } from "@/lib/utils";
import { eventHref, type EventTypeStr } from "@/lib/events";

export interface ItineraryShow {
  id: string;
  type: EventTypeStr;
  title: string;
  date: Date | string;
  venue: string | null;
  city: string | null;
  state: string | null;
  country: string;
  venueAddress: string | null;
  loadInTime: Date | string | null;
  doorsTime: Date | string | null;
  setTime: Date | string | null;
}

/**
 * Builds the sms: body for "Text itinerary" — title/date, load-in/doors/set,
 * a Maps link for the venue, and a link back to the show in the app. Plain
 * URLs so Messages/Android auto-linkify them as tappable.
 */
export function buildItineraryMessage(
  show: ItineraryShow,
  appUrl: string
): string {
  const fullAddress = [
    show.venueAddress,
    [show.venue, show.city, show.state, show.country]
      .filter(Boolean)
      .join(", ")
  ]
    .filter(Boolean)
    .join(", ");

  return [
    `${show.title} — ${formatDate(show.date)}`,
    [
      show.loadInTime && `Load-in ${formatTime(show.loadInTime)}`,
      show.doorsTime && `Doors ${formatTime(show.doorsTime)}`,
      show.setTime && `Set ${formatTime(show.setTime)}`
    ]
      .filter(Boolean)
      .join(" · "),
    [show.venue, show.city, show.state].filter(Boolean).join(", "),
    fullAddress &&
      `https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`,
    `Details: ${appUrl}${eventHref(show.type, show.id)}`
  ]
    .filter(Boolean)
    .join("\n");
}
