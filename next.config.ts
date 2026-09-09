import type { NextConfig } from "next";

// Top-level segments of the (protected) route group, plus /bands/new which
// also requires a session. Their pages render per-request from the signed-in
// user's data, so without an explicit no-store the browser is free to
// bfcache them — letting Back after sign-out show the authenticated page
// again without ever re-running the server's session check.
const PROTECTED_PATH_PREFIXES = [
  "admin",
  "bands",
  "calendar",
  "my-availability",
  "practices",
  "recordings",
  "releases",
  "shows",
  "songs"
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // The service worker must be served as JS and never cached, so a
        // deploy's new sw.js is picked up immediately.
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8"
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate"
          }
        ]
      },
      ...PROTECTED_PATH_PREFIXES.flatMap((prefix) => [
        {
          source: `/${prefix}`,
          headers: [{ key: "Cache-Control", value: "no-store" }]
        },
        {
          source: `/${prefix}/:path*`,
          headers: [{ key: "Cache-Control", value: "no-store" }]
        }
      ])
    ];
  }
};

export default nextConfig;
