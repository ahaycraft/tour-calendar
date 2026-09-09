"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Opt-in control for Web Push notifications. Registers the service worker,
 * requests permission, and stores/removes the subscription via
 * /api/push/subscribe. One subscription per browser+device.
 *
 * iOS delivers push only to a PWA installed to the Home Screen, so on iOS
 * Safari (not standalone) we show the install hint instead of a toggle.
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

type State =
  "loading" | "unsupported" | "ios-install" | "subscribed" | "unsubscribed";

/** Shared by PushMenuItem (account menus) and PushNudge (my-availability). */
export function usePushSubscription() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function detect() {
      const supported =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;

      if (!supported || !VAPID_PUBLIC_KEY) {
        const isIOS =
          /iphone|ipad|ipod/i.test(navigator.userAgent) &&
          !("MSStream" in window);
        const isStandalone =
          window.matchMedia("(display-mode: standalone)").matches ||
          // iOS-only flag
          (navigator as unknown as { standalone?: boolean }).standalone ===
            true;
        if (!cancelled) {
          setState(isIOS && !isStandalone ? "ios-install" : "unsupported");
        }
        return;
      }

      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) setState(sub ? "subscribed" : "unsubscribed");
      } catch {
        if (!cancelled) setState("unsupported");
      }
    }

    void detect();

    return () => {
      cancelled = true;
    };
  }, []);

  const subscribe = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError(
          permission === "denied"
            ? "Notifications are blocked for this site. Enable them in your browser settings, then try again."
            : "Permission wasn't granted."
        );
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY as string)
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON())
      });
      if (!res.ok) throw new Error("save failed");

      setState("subscribed");
    } catch {
      setError("Couldn't turn on notifications. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint })
        });
        await sub.unsubscribe();
      }
      setState("unsubscribed");
    } catch {
      setError("Couldn't turn off notifications. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, busy, error, subscribe, unsubscribe };
}

/**
 * Compact row for the account menus (desktop dropdown + mobile drawer) —
 * pass `className` to match whichever menu's row styling it's dropped into.
 * Renders nothing while loading/unsupported, same as before.
 */
export default function PushMenuItem({
  className,
  iconSize = 16
}: {
  className?: string;
  iconSize?: number;
}) {
  const { state, busy, error, subscribe, unsubscribe } = usePushSubscription();

  if (state === "loading" || state === "unsupported") return null;

  if (state === "ios-install") {
    return (
      <div className={cn(className)}>
        <div className="flex items-center gap-2">
          <Bell size={iconSize} className="shrink-0" />
          Notifications
        </div>
        <p className="mt-0.5 text-xs opacity-75">
          Add to Home Screen from the Share menu to enable.
        </p>
      </div>
    );
  }

  const on = state === "subscribed";

  return (
    <div>
      <button
        type="button"
        onClick={on ? unsubscribe : subscribe}
        disabled={busy}
        className={cn("flex w-full items-center gap-2 text-left", className)}
      >
        {busy ? (
          <Loader2 size={iconSize} className="shrink-0 animate-spin" />
        ) : on ? (
          <BellRing size={iconSize} className="shrink-0 text-blue-400" />
        ) : (
          <BellOff size={iconSize} className="shrink-0" />
        )}
        {on ? "Turn off notifications" : "Turn on notifications"}
      </button>
      {error && <p className="px-3 pb-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
