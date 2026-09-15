export { authMiddleware as proxy } from "@/auth";

export const config = {
  matcher: [
    // api/mobile/login is how a mobile client gets its first Bearer token,
    // so it has to be reachable with no auth at all yet, same as login/register.
    "/((?!api/auth|api/mobile/login|login|register|_next/static|_next/image|favicon.ico).*)"
  ]
};
