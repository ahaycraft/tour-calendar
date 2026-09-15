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

/** Wraps a route handler, adding CORS headers to whatever response it
 *  returns when the request's Origin is on the allow-list. */
export async function withCors(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const response = await handler();
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
