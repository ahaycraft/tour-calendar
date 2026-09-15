import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/my-availability", label: "My Responses" },
  { href: "/my-availability/blocked-dates", label: "Blocked Dates" }
] as const;

// Unlike EventTypeTabs (mobile-only, since desktop has the "Events ▾"
// dropdown), My Availability has no desktop grouping — these tabs are the
// only way to reach Blocked Dates there too, so they render at every width.
export default function MyAvailabilityTabs({
  active,
  needsResponseCount = 0
}: {
  active: (typeof TABS)[number]["href"];
  needsResponseCount?: number;
}) {
  return (
    <div className="flex gap-1 p-1 mb-6 bg-zinc-800/60 rounded-xl">
      {TABS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          aria-current={active === href ? "page" : undefined}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors",
            active === href
              ? "bg-zinc-700 text-zinc-50"
              : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          {label}
          {href === "/my-availability" && needsResponseCount > 0 && (
            <span
              aria-hidden
              className="w-1.5 h-1.5 rounded-full bg-amber-500"
            />
          )}
        </Link>
      ))}
    </div>
  );
}
