import { NextRequest, NextResponse } from "next/server";

// The mobile app's web target (Expo web, via `npm run web`) runs in an
// actual browser, so it's subject to CORS unlike the native iOS/Android
// builds. An explicit allow-list, not "*", since these responses can carry
// auth-adjacent data. Add the Expo web build's real origin here once it has
// one; for now this only needs to cover local development.
const ALLOWED_ORIGINS = new Set([
  "http://localhost:8081",
  "http://localhost:19006"
]);

function originHeaders(origin: string | null): HeadersInit {
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return {};
  return { "Access-Control-Allow-Origin": origin, Vary: "Origin" };
}

/**
 * Wraps a route handler, adding CORS headers to whatever response it
 * returns when the request's Origin is on the allow-list.
 *
 * Also catches anything the handler throws: an *uncaught* error skips this
 * function's header-attaching entirely (Next's own generic error response
 * takes over instead), which strips CORS headers from the error response —
 * so a real server bug shows up to a browser client as an opaque "Failed
 * to fetch" with no status code or error message to debug from, instead of
 * the actual error.
 */
export async function withCors(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  let response: NextResponse;
  try {
    response = await handler();
  } catch (err) {
    console.error("Unhandled error in CORS-wrapped route:", err);
    response = NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
  for (const [key, value] of Object.entries(
    originHeaders(request.headers.get("origin"))
  )) {
    response.headers.set(key, value);
  }
  return response;
}

/** For a route's `OPTIONS` export — answers the browser's CORS preflight. */
export function corsPreflight(request: NextRequest): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...originHeaders(request.headers.get("origin")),
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}
