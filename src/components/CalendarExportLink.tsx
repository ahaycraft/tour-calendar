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
  variant = "outline",
}: {
  href: string;
  label?: string;
  variant?: "outline" | "primary";
}) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 font-medium transition-colors",
        variant === "primary"
          ? "px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-500"
          : "px-3 py-2 text-sm rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
      )}
    >
      <CalendarPlus size={15} />
      {label}
    </a>
  );
}
