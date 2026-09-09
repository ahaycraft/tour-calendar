import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/shows", label: "Shows" },
  { href: "/practices", label: "Practices" },
  { href: "/recordings", label: "Recordings" }
] as const;

// Mobile-only stand-in for the desktop "Events ▾" dropdown — the bottom nav's
// Events tab always lands on /shows, so this is how Practices/Recordings
// stay reachable without needing the (soon to be retired) hamburger drawer.
export default function EventTypeTabs({
  active
}: {
  active: (typeof TABS)[number]["href"];
}) {
  return (
    <div className="lg:hidden flex gap-1 p-1 mb-6 bg-zinc-800/60 rounded-xl">
      {TABS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          aria-current={active === href ? "page" : undefined}
          className={cn(
            "flex-1 text-center py-2 rounded-lg text-sm font-medium transition-colors",
            active === href
              ? "bg-zinc-700 text-zinc-50"
              : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
