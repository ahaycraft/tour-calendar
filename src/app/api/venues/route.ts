import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { searchVenues, type VenueResult } from "@/lib/venues";

// Small in-process cache so repeated keystrokes / retries don't hammer the
// upstream geocoder. Fine for a single-instance dev/hobby deployment.
const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, { at: number; results: VenueResult[] }>();

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = (request.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json([]);

  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return NextResponse.json(hit.results);
  }

  try {
    const results = await searchVenues(q);
    cache.set(key, { at: Date.now(), results });
    return NextResponse.json(results);
  } catch (err) {
    console.error("Venue search failed:", err);
    return NextResponse.json({ error: "Venue search unavailable" }, { status: 502 });
  }
}
