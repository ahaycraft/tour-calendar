import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Woodshedd",
    short_name: "Woodshedd",
    description: "Band calendar, availability, songwriting, and release planning",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    // The /icon-*.png files live in public/, so they have no content hash in
    // their URL. Bump ?v when the artwork changes so browsers and installed
    // PWAs fetch the new file instead of a cached one. (app/apple-icon.png is
    // hashed automatically by Next, so it isn't versioned here.)
    icons: [
      {
        src: "/icon-192.png?v=2",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png?v=2",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png?v=2",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
