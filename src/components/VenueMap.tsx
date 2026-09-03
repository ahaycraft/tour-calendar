"use client";

import { useEffect, useRef } from "react";
import { MapPin } from "lucide-react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

interface Props {
  lat: number | null;
  lng: number | null;
  label: string;
  address?: string | null;
  /** True when the pin was geocoded from the address rather than saved with the venue. */
  approximate?: boolean;
}

export default function VenueMap({ lat, lng, label, address, approximate }: Props) {
  const hasCoords = lat != null && lng != null;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    if (lat == null || lng == null || !containerRef.current) return;
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: [lat, lng],
        zoom: 15,
        scrollWheelZoom: false,
      });
      mapRef.current = map;

      // Esri's Dark Gray Canvas — a real dark basemap, served without an API
      // key. Drawn as base (land + roads) plus a reference layer for labels.
      const esri = "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas";
      L.tileLayer(`${esri}/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`, {
        maxZoom: 19,
        maxNativeZoom: 16,
        attribution:
          'Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors',
      }).addTo(map);
      L.tileLayer(`${esri}/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, {
        maxZoom: 19,
        maxNativeZoom: 16,
      }).addTo(map);

      const icon = L.divIcon({
        className: "",
        html: '<span style="display:block;width:16px;height:16px;border-radius:9999px;background:#3b82f6;border:2px solid #fafafa;box-shadow:0 0 0 2px rgba(0,0,0,.45)"></span>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      L.marker([lat, lng], { icon }).addTo(map);

      // Container has just been laid out — make sure Leaflet measured it.
      setTimeout(() => map.invalidateSize(), 0);
    });

    return () => {
      cancelled = true;
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
            {address && <p className="text-zinc-400 mb-1">{address}</p>}
            <div className="flex gap-4">
              <a
                href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                Larger map ↗
              </a>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${lat}%2C${lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                Google Maps ↗
              </a>
            </div>
          </div>
        </>
      ) : (
        <div className="p-5 text-sm text-zinc-500">
          No location pinned for this venue. Re-add it from venue search to drop a
          pin, or{" "}
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
