"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";

/**
 * Opt-in control for Web Push notifications. Registers the service worker,
 * requests permission, and stores/removes the subscription via
 * /api/push/subscribe. One subscription per browser+device.
 *
 * iOS delivers push only to a PWA installed to the Home Screen, so on iOS
 * Safari (not standalone) we show the install hint instead of the button.
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

type State = "loading" | "unsupported" | "ios-install" | "subscribed" | "unsubscribed";

export default function PushToggle() {
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
          (navigator as unknown as { standalone?: boolean }).standalone === true;
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
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY as string),
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
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
          body: JSON.stringify({ endpoint: sub.endpoint }),
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

  if (state === "loading" || state === "unsupported") return null;

  if (state === "ios-install") {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">
        <div className="mb-1 flex items-center gap-2 font-medium text-zinc-200">
          <Bell size={15} />
          Get notified on your iPhone
        </div>
        Open the Share menu and tap{" "}
        <span className="text-zinc-200">Add to Home Screen</span>. Then open
        Woodshedd from the new icon and turn on notifications here.
      </div>
    );
  }

  const on = state === "subscribed";

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-medium text-zinc-100">
            {on ? (
              <BellRing size={15} className="text-blue-400" />
            ) : (
              <BellOff size={15} className="text-zinc-500" />
            )}
            Push notifications
          </div>
          <p className="mt-0.5 text-sm text-zinc-500">
            {on
              ? "This device is on. You'll be alerted about new shows and pending availability."
              : "Get alerted on this device when a show is added or your availability is still needed."}
          </p>
        </div>
        <button
          type="button"
          onClick={on ? unsubscribe : subscribe}
          disabled={busy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 size={14} className="animate-spin" />
          ) : on ? (
            <BellOff size={14} />
          ) : (
            <Bell size={14} />
          )}
          {on ? "Turn off" : "Turn on"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
