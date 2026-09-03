"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarPlus, ExternalLink } from "lucide-react";

/**
 * Dropdown that adds a show/recording to the viewer's calendar. Google opens
 * a prefilled template in a new tab; the .ics link is served with
 * `Content-Type: text/calendar`, so browsers download it and iOS Safari opens
 * the native "Add to Calendar" sheet. Both URLs are built on the server.
 */
export default function AddToCalendar({
  googleUrl,
  icsUrl,
}: {
  googleUrl: string;
  icsUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node))
        setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 font-medium transition-colors"
      >
        <CalendarPlus size={14} />
        Add to calendar
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1 w-56 z-50 rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl py-1"
        >
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            <ExternalLink size={14} className="shrink-0 text-zinc-500" />
            Google Calendar
          </a>
          <a
            href={icsUrl}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            <CalendarPlus size={14} className="shrink-0 text-zinc-500" />
            Apple Calendar / Outlook
          </a>
        </div>
      )}
    </div>
  );
}
