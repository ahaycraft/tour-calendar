"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, CalendarDays, Music, Disc3, UserX } from "lucide-react";
import { cn, pathMatches } from "@/lib/utils";

// Same icon set as Nav's mobile drawer (Calendar, CalendarDays, Music, Disc3,
// UserX) so the two stay visually consistent until dedicated icons land.
const ITEMS = [
  { href: "/calendar", label: "Calendar", icon: Calendar },
  {
    href: "/shows",
    label: "Events",
    icon: CalendarDays,
    // Shows/practices/recordings are one grouping in the desktop nav's
    // "Events" dropdown — the tab lights up for any of the three here too.
    activeMatch: ["/shows", "/practices", "/recordings"]
  },
  { href: "/songs", label: "Songs", icon: Music },
  { href: "/releases", label: "Releases", icon: Disc3 },
  { href: "/my-availability", label: "My Availability", icon: UserX }
];

export default function BottomNav({
  needsResponseCount = 0
}: {
  needsResponseCount?: number;
}) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  // Position/size of the highlight pill, measured from the active item's DOM
  // node so it lands correctly whatever the container width. `null` until the
  // first measurement, or when no nav item matches the route.
  const [pill, setPill] = useState<{ x: number; y: number; size: number } | null>(
    null
  );

  const activeIndex = ITEMS.findIndex(({ href, activeMatch }) =>
    (activeMatch ?? [href]).some((m) => pathMatches(pathname, m))
  );

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    function measure() {
      const nav = navRef.current;
      if (!nav) return;
      if (activeIndex < 0) {
        setPill(null);
        return;
      }
      const el =
        nav.querySelectorAll<HTMLElement>("[data-nav-item]")[activeIndex];
      if (!el) return;
      setPill({ x: el.offsetLeft, y: el.offsetTop, size: el.offsetWidth });
    }

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(nav);
    return () => ro.disconnect();
  }, [activeIndex]);

  return (
    <nav
      ref={navRef}
      aria-label="Primary"
      className="lg:hidden fixed left-4 right-4 z-40 mx-auto max-w-md bottom-[calc(1rem+env(safe-area-inset-bottom))] flex items-center justify-between p-2 rounded-full bg-zinc-800/25 backdrop-blur-xl border border-zinc-700 shadow-2xl"
    >
      {pill && (
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 rounded-full bg-blue-600/20 transition-transform duration-300 ease-out motion-reduce:transition-none"
          style={{
            width: pill.size,
            height: pill.size,
            transform: `translate3d(${pill.x}px, ${pill.y}px, 0)`
          }}
        />
      )}

      {ITEMS.map(({ href, label, icon: Icon }, i) => {
        const active = i === activeIndex;
        const showBadge = href === "/my-availability" && needsResponseCount > 0;
        return (
          <Link
            key={href}
            href={href}
            data-nav-item
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative z-10 flex items-center justify-center w-12 h-12 rounded-full transition-colors",
              active ? "text-blue-400" : "text-zinc-400 hover:text-zinc-100"
            )}
          >
            <Icon size={22} />
            {showBadge && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
