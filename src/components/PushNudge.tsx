"use client";

import { Bell } from "lucide-react";
import { usePushSubscription } from "./PushToggle";

/**
 * Slim opt-in prompt for /my-availability — the full toggle lives in the
 * account menus now (see PushMenuItem), but this stays here since it's the
 * moment turning notifications on is most relevant (right after landing on
 * a page you likely got here via a push about). Hidden once subscribed, and
 * for the loading/unsupported/ios-install states — those are handled (or
 * don't apply) in the account menu instead.
 */
export default function PushNudge() {
  const { state, busy, subscribe } = usePushSubscription();

  if (state !== "unsubscribed") return null;

  return (
    <div className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-zinc-300">
        <Bell size={15} className="shrink-0 text-zinc-500" />
        Get notified about new shows and pending availability.
      </div>
      <button
        type="button"
        onClick={subscribe}
        disabled={busy}
        className="shrink-0 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-60"
      >
        {busy ? "Working…" : "Turn on"}
      </button>
    </div>
  );
}
