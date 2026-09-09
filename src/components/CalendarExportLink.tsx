import { CalendarPlus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Link to a multi-event `.ics` export (see /api/shows/calendar.ics). A plain
 * anchor, not next/link: the target is a file download. On iOS it opens the
 * native "add all" sheet; elsewhere it downloads, and can be pulled into Google
 * Calendar via Settings → Import & Export. (Google has no URL for adding a set
 * of events, so there's no one-tap Google option here — unlike the per-event
 * AddToCalendar.)
 */
export default function CalendarExportLink({
  href,
  label = "Add to calendar",
  variant = "outline"
}: {
  href: string;
  label?: string;
  variant?: "outline" | "primary";
}) {
  return (
    <a
      href={href}
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full text-sm font-medium transition-colors",
        variant === "primary"
          ? "h-10 w-10 bg-blue-600 text-white hover:bg-blue-500 sm:h-auto sm:w-auto sm:rounded-lg sm:px-4 sm:py-2"
          : "h-9 w-9 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 sm:h-auto sm:w-auto sm:rounded-lg sm:px-3 sm:py-1.5"
      )}
    >
      <CalendarPlus size={15} />
      <span className="hidden sm:inline">{label}</span>
    </a>
  );
}
