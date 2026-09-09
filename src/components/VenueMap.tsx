"use client";

import { useEffect, useRef } from "react";
import { MapPin, UtensilsCrossed, Fuel } from "lucide-react";
import type { Map as MapboxMap, Marker as MapboxMarker } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface Props {
  lat: number | null;
  lng: number | null;
  label: string;
  address?: string | null;
  /** True when the pin was geocoded from the address rather than saved with the venue. */
  approximate?: boolean;
}

export default function VenueMap({
  lat,
  lng,
  label,
  address,
  approximate
}: Props) {
  const hasCoords = lat != null && lng != null;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markerRef = useRef<MapboxMarker | null>(null);

  useEffect(() => {
    if (lat == null || lng == null || !containerRef.current) return;
    let cancelled = false;

    import("mapbox-gl").then((mod) => {
      if (cancelled || !containerRef.current) return;
      const mapboxgl = mod.default;
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";

      // WebGL vector rendering — continuous smooth zoom/pan instead of
      // Leaflet's stepped raster tiles, plus full control over the marker
      // and (compact, collapsible-by-default) attribution.
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [lng, lat],
        zoom: 15,
        scrollZoom: false,
        attributionControl: false
      });
      mapRef.current = map;

      map.addControl(
        new mapboxgl.NavigationControl({ showCompass: false }),
        "top-right"
      );
      map.addControl(
        new mapboxgl.AttributionControl({ compact: true }),
        "bottom-right"
      );

      const el = document.createElement("div");
      el.style.cssText =
        "width:16px;height:16px;border-radius:9999px;background:#3b82f6;border:2px solid #fafafa;box-shadow:0 0 0 2px rgba(0,0,0,.45)";
      markerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map);
    });

    return () => {
      cancelled = true;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [lat, lng]);

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
      <div className="px-5 py-3 border-b border-zinc-800 flex items-center gap-2">
        <MapPin size={15} className="text-zinc-500" />
        <span className="text-sm font-medium text-zinc-200">Location</span>
        {hasCoords && approximate && (
          <span className="text-xs text-zinc-600">· approximate</span>
        )}
      </div>

      {hasCoords ? (
        <>
          <div ref={containerRef} className="w-full h-64 lg:h-80" />
          <div className="px-5 py-3 text-xs">
            {address && <p className="text-zinc-400 mb-3">{address}</p>}
            <div className="flex gap-2">
              <a
                href={`https://www.google.com/maps/search/restaurants/@${lat},${lng},15z`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-700 py-2.5 text-sm font-medium text-blue-400 transition-colors hover:bg-zinc-800 hover:text-blue-300"
              >
                <UtensilsCrossed size={15} />
                Food nearby
              </a>
              <a
                href={`https://www.google.com/maps/search/gas+station/@${lat},${lng},15z`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-700 py-2.5 text-sm font-medium text-blue-400 transition-colors hover:bg-zinc-800 hover:text-blue-300"
              >
                <Fuel size={15} />
                Gas nearby
              </a>
            </div>
          </div>
        </>
      ) : (
        <div className="p-5 text-sm text-zinc-500">
          No location pinned for this venue. Re-add it from venue search to drop
          a pin, or{" "}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              [label, address].filter(Boolean).join(" ")
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300"
          >
            search Maps ↗
          </a>
          .
        </div>
      )}
    </div>
  );
}
