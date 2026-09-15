export { authMiddleware as proxy } from "@/auth";

export const config = {
  matcher: [
    // The whole api/mobile namespace is excluded, not just login: every
    // route under it already checks auth() itself (Bearer-aware), and a
    // browser's CORS preflight (OPTIONS) request carries no auth at all —
    // the proxy would otherwise redirect a preflight to /login and break
    // CORS for the mobile app's web target before it reaches the route.
    "/((?!api/auth|api/mobile|login|register|_next/static|_next/image|favicon.ico).*)"
  ]
};
