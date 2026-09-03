// Venue lookup used by the "add an event" flow.
//
// Default provider is Photon (https://photon.komoot.io) — an OpenStreetMap-based
// geocoder that needs no API key and is free. If GOOGLE_PLACES_API_KEY is set we
// use the Google Places API (New) instead, which has richer venue coverage but
// requires a billing-enabled Google Cloud account.

import { normalizeRegion } from "./regions";

export interface VenueResult {
  id: string;
  name: string;
  /** Single-line formatted address, best-effort. */
  address: string;
  city: string;
  /** State / region. May be empty. */
  state: string;
  /** ISO 3166-1 alpha-2 country code when known, else "". */
  country: string;
  lat: number | null;
  lng: number | null;
  source: "photon" | "google";
}

export function activeVenueProvider(): "photon" | "google" {
  return process.env.GOOGLE_PLACES_API_KEY ? "google" : "photon";
}

export async function searchVenues(query: string): Promise<VenueResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  return activeVenueProvider() === "google"
    ? searchGooglePlaces(q)
    : searchPhoton(q);
}

// Best-effort coordinates for an event whose venue was typed by hand (no pin
// saved). Results are cached for a day so detail pages don't re-geocode on
// every render.
const geocodeCache = new Map<
  string,
  { at: number; coords: { lat: number; lng: number } | null }
>();
const GEOCODE_TTL_MS = 24 * 60 * 60 * 1000;

export async function geocodeVenue(
  venue: string,
  city: string,
  state?: string | null,
  country?: string | null
): Promise<{ lat: number; lng: number } | null> {
  const query = [venue, city, state, country].filter(Boolean).join(", ");
  if (query.trim().length < 3) return null;

  const key = query.toLowerCase();
  const hit = geocodeCache.get(key);
  if (hit && Date.now() - hit.at < GEOCODE_TTL_MS) return hit.coords;

  let coords: { lat: number; lng: number } | null = null;
  try {
    const match = (await searchVenues(query)).find(
      (r) => r.lat != null && r.lng != null
    );
    if (match) coords = { lat: match.lat as number, lng: match.lng as number };
  } catch {
    coords = null;
  }
  geocodeCache.set(key, { at: Date.now(), coords });
  return coords;
}

// --- Photon -----------------------------------------------------------------

interface PhotonFeature {
  properties: {
    osm_id?: number | string;
    name?: string;
    housenumber?: string;
    street?: string;
    city?: string;
    district?: string;
    locality?: string;
    state?: string;
    postcode?: string;
    country?: string;
    countrycode?: string;
  };
  geometry?: { coordinates?: [number, number] };
}

async function searchPhoton(q: string): Promise<VenueResult[]> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8&lang=en`;
  const res = await fetch(url, {
    headers: { "User-Agent": "woodshed (venue lookup)" },
  });
  if (!res.ok) throw new Error(`Photon returned ${res.status}`);
  const data = (await res.json()) as { features?: PhotonFeature[] };

  const results: VenueResult[] = [];
  for (const f of data.features ?? []) {
    const p = f.properties ?? {};
    const name = p.name || p.street || "";
    if (!name) continue;
    const coords = f.geometry?.coordinates;
    const streetLine = [p.housenumber, p.street].filter(Boolean).join(" ");
    const city = p.city || p.district || p.locality || "";
    const country = (p.countrycode || "").toUpperCase();
    const address = [streetLine, city, p.state, p.postcode, p.country]
      .filter(Boolean)
      .join(", ");
    results.push({
      id: `photon-${p.osm_id ?? `${coords?.[1]},${coords?.[0]}`}`,
      name,
      address,
      city,
      state: normalizeRegion(p.state || "", country),
      country,
      lat: coords ? coords[1] : null,
      lng: coords ? coords[0] : null,
      source: "photon",
    });
  }
  return results;
}

// --- Google Places (New) --------------------------------------------------

interface GooglePlace {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  addressComponents?: Array<{
    longText?: string;
    shortText?: string;
    types?: string[];
  }>;
}

async function searchGooglePlaces(q: string): Promise<VenueResult[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY as string,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.addressComponents",
    },
    body: JSON.stringify({ textQuery: q, maxResultCount: 8 }),
  });
  if (!res.ok) throw new Error(`Google Places returned ${res.status}`);
  const data = (await res.json()) as { places?: GooglePlace[] };

  return (data.places ?? []).map((place) => {
    const comp = (type: string) =>
      place.addressComponents?.find((c) => c.types?.includes(type));
    const country = comp("country")?.shortText || "";
    const region =
      comp("administrative_area_level_1")?.shortText ||
      comp("administrative_area_level_1")?.longText ||
      "";
    return {
      id: `google-${place.id}`,
      name: place.displayName?.text || place.formattedAddress || "",
      address: place.formattedAddress || "",
      city:
        comp("locality")?.longText ||
        comp("postal_town")?.longText ||
        comp("administrative_area_level_2")?.longText ||
        "",
      state: normalizeRegion(region, country),
      country,
      lat: place.location?.latitude ?? null,
      lng: place.location?.longitude ?? null,
      source: "google",
    };
  });
}
