// Builds the mobile app's UpcomingShowActivity props (see woodshedd_mobile's
// src/widgets/upcoming-show-activity.tsx) from a Show record. Field names
// here must exactly match that widget's prop shape — this is serialized
// straight into the push-to-start payload's content-state.props.

interface ShowForActivity {
  title: string;
  date: Date;
  venue: string | null;
  city: string | null;
  state: string | null;
  venueAddress: string | null;
  loadInTime: Date | null;
  doorsTime: Date | null;
  setTime: Date | null;
}

export interface ShowActivityProps {
  title: string;
  dateLabel: string;
  venueLabel: string;
  loadInLabel: string | null;
  doorsLabel: string | null;
  setLabel: string | null;
}

// Push-to-start content is rendered once, server-side, with no per-viewer
// context — there's no venue-timezone column to format against, so this
// (like the rest of the app) treats each stored timestamp's UTC clock
// reading as the intended local wall-clock time.
function formatDateLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  });
}

function formatTimeLabel(date: Date | null): string | null {
  if (!date) return null;
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC"
  });
}

function venueLabel(show: ShowForActivity): string {
  if (show.venueAddress) return show.venueAddress;
  return [show.venue, show.city, show.state].filter(Boolean).join(", ") || "Venue TBA";
}

export function buildShowActivityProps(show: ShowForActivity): ShowActivityProps {
  return {
    title: show.title,
    dateLabel: formatDateLabel(show.date),
    venueLabel: venueLabel(show),
    loadInLabel: formatTimeLabel(show.loadInTime),
    doorsLabel: formatTimeLabel(show.doorsTime),
    setLabel: formatTimeLabel(show.setTime)
  };
}
