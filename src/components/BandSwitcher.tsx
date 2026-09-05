"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus, Settings } from "lucide-react";

export interface NavBand {
  id: string;
  name: string;
  slug: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
}

export default function BandSwitcher({
  bands,
  activeBandId,
  variant = "bar",
  onNavigate,
}: {
  bands: NavBand[];
  activeBandId: string;
  variant?: "bar" | "drawer";
  // Called whenever picking a band or following a link here completes an
  // action — lets an ancestor (e.g. the mobile nav drawer) close itself too.
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const active = bands.find((b) => b.id === activeBandId) ?? bands[0];

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
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

  async function pick(id: string) {
    setOpen(false);
    onNavigate?.();
    if (id === activeBandId) return;
    setSwitching(true);
    await fetch("/api/active-band", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bandId: id }),
    });
    setSwitching(false);
    router.refresh();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={switching}
        aria-haspopup="menu"
        aria-expanded={open}
        className={
          variant === "drawer"
            ? "flex w-full items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100"
            : "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-800 transition-colors max-w-[12rem]"
        }
      >
        <span className="truncate">{active?.name ?? "Choose a band"}</span>
        <ChevronsUpDown size={14} className="shrink-0 text-zinc-500" />
      </button>

      {open && (
        <div
          role="menu"
          className={`${
            variant === "drawer" ? "mt-1 w-full" : "absolute left-0 mt-1 w-60"
          } z-50 rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl py-1`}
        >
          <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
            Bands
          </div>
          {bands.map((b) => (
            <button
              key={b.id}
              type="button"
              role="menuitemradio"
              aria-checked={b.id === activeBandId}
              onClick={() => pick(b.id)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
            >
              <Check
                size={14}
                className={b.id === activeBandId ? "text-blue-400" : "text-transparent"}
              />
              <span className="flex-1 truncate">{b.name}</span>
              {b.role !== "MEMBER" && (
                <span className="text-[10px] text-zinc-500">{b.role.toLowerCase()}</span>
              )}
            </button>
          ))}
          <div className="my-1 border-t border-zinc-800" />
          <Link
            href="/bands/new"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            <Plus size={14} />
            New band
          </Link>
          <Link
            href="/bands/settings"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            <Settings size={14} />
            Band settings
          </Link>
        </div>
      )}
    </div>
  );
}
