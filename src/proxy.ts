export { authMiddleware as proxy } from "@/auth";

export const config = {
  matcher: [
    // The whole api/mobile namespace is excluded, not just login: every
    // route under it already checks auth() itself (Bearer-aware), and a
    // browser's CORS preflight (OPTIONS) request carries no auth at all —
    // the proxy would otherwise redirect a preflight to /login and break
    // CORS for the mobile app's web target before it reaches the route.
    //
    // api/push is excluded for the same reason as api/mobile: every route
    // under it (remind, event-reminders, live-activity-start) checks its
    // own CRON_SECRET bearer token instead of a session, and Vercel Cron's
    // request carries neither a cookie nor a valid mobile token — without
    // this, the proxy redirected every cron invocation to /login before the
    // route's own auth check ever ran, so none of them ever actually fired.
    "/((?!api/auth|api/mobile|api/push|login|register|_next/static|_next/image|favicon.ico).*)"
  ]
};
