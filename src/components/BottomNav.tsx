"use client";

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

  return (
    <nav
      aria-label="Primary"
      className="lg:hidden fixed left-4 right-4 z-40 mx-auto max-w-md bottom-[calc(1rem+env(safe-area-inset-bottom))] flex items-center justify-between p-2 rounded-full bg-zinc-800/25 backdrop-blur-xl border border-zinc-700 shadow-2xl"
    >
      {ITEMS.map(({ href, label, icon: Icon, activeMatch }) => {
        const active = (activeMatch ?? [href]).some((m) =>
          pathMatches(pathname, m)
        );
        const showBadge = href === "/my-availability" && needsResponseCount > 0;
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center justify-center w-12 h-12 rounded-full transition-colors",
              active
                ? "bg-blue-600/20 text-blue-400"
                : "text-zinc-400 hover:text-zinc-100"
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
