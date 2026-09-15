export interface CachedShow {
  id: string;
  type: "SHOW" | "RECORDING" | "PRACTICE";
  title: string;
  venue: string | null;
  city: string | null;
  state?: string;
  date: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  availability: Array<{
    userId: string;
    status: string;
    user: { name: string };
  }>;
}

export interface CachedUnavailableDate {
  id: string;
  date: string;
  note?: string;
  userId: string;
  user: { name: string };
}

interface Cache {
  bandId: string;
  shows: CachedShow[];
  unavailableDates: CachedUnavailableDate[];
  loadedRanges: Set<string>;
}

// Module-level, so it survives CalendarView unmounting when you navigate
// away from /calendar and back within the same session — only cleared by a
// full page reload or invalidateCalendarCache(). Not persisted anywhere
// else (not sessionStorage, not a server cache): it's purely an in-memory
// "don't show a loader for data we already fetched this session" cache.
let cache: Cache | null = null;

/** The cached calendar data for `bandId`, or null if nothing's cached yet
 *  (first visit this session, a different band, or a mutation invalidated
 *  it since). */
export function readCalendarCache(bandId: string): Cache | null {
  return cache && cache.bandId === bandId ? cache : null;
}

export function writeCalendarCache(
  bandId: string,
  shows: CachedShow[],
  unavailableDates: CachedUnavailableDate[],
  loadedRanges: Set<string>
) {
  cache = { bandId, shows, unavailableDates, loadedRanges };
}

/**
 * Call after any show or member-unavailability mutation succeeds, from
 * anywhere in the app — not just CalendarView. Deliberately coarse (clears
 * everything rather than tracking which dates changed): the calendar just
 * refetches next time it's visited, which is simpler and safer than trying
 * to patch the cache in place from every call site.
 */
export function invalidateCalendarCache() {
  cache = null;
}
