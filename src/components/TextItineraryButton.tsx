"use client";

import { MessageCircle } from "lucide-react";

/**
 * sms: URIs pre-fill the message body differently by platform — iOS wants
 * `&body=`, everything else wants `?body=`. Read from navigator at click
 * time rather than baking a href server-side.
 */
export default function TextItineraryButton({
  phones,
  message
}: {
  phones: string[];
  message: string;
}) {
  if (phones.length === 0) return null;

  function send() {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const separator = isIOS ? "&" : "?";
    window.location.href = `sms:${phones.join(",")}${separator}body=${encodeURIComponent(message)}`;
  }

  return (
    <button
      type="button"
      onClick={send}
      className="inline-flex h-9 w-9 items-center justify-center gap-1.5 rounded-full border border-zinc-700 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100 sm:h-auto sm:w-auto sm:rounded-lg sm:px-3 sm:py-1.5"
    >
      <MessageCircle size={14} />
      <span className="hidden sm:inline">Text itinerary</span>
    </button>
  );
}
