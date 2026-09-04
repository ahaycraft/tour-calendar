"use client";

import { useEffect } from "react";

/**
 * Backstop for the CSS launch splash defined in globals.css. The overlay is
 * server-rendered by layout.tsx and hidden by a one-shot CSS animation; once
 * the app has mounted this drops the (already invisible) node from the DOM.
 * It also removes the overlay immediately when the app is not running as an
 * installed PWA, matching the `.no-splash` guard the inline script in
 * layout.tsx sets before first paint.
 */
export function SplashScreen() {
  useEffect(() => {
    const el = document.getElementById("app-splash");
    if (!el) return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (!standalone) {
      el.remove();
      return;
    }

    // Outlast the CSS fade (600ms delay + 350ms), then reclaim the node.
    const timer = window.setTimeout(() => el.remove(), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
