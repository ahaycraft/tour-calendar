"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Calendar,
  List,
  Mic,
  Music,
  Disc3,
  UserX,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import BandSwitcher, { type NavBand } from "./BandSwitcher";

interface NavProps {
  user: { name: string; email: string; role: string };
  bands: NavBand[];
  activeBandId: string;
  needsResponseCount?: number;
}

const links = [
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/shows", label: "Shows", icon: List },
  { href: "/recordings", label: "Recordings", icon: Mic },
  { href: "/songs", label: "Songs", icon: Music },
  { href: "/releases", label: "Releases", icon: Disc3 },
  { href: "/my-availability", label: "My Availability", icon: UserX },
];

export default function Nav({
  user,
  bands,
  activeBandId,
  needsResponseCount = 0,
}: NavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const activeRole = bands.find((b) => b.id === activeBandId)?.role;
  const roleChip =
    activeRole === "OWNER" ? "Owner" : activeRole === "ADMIN" ? "Admin" : null;

  const badgeFor = (href: string) =>
    href === "/my-availability" && needsResponseCount > 0 ? needsResponseCount : 0;
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  // While the drawer is open: lock scroll, trap focus, close on Escape,
  // and restore focus to the trigger on close.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;

    const focusable = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      );

    focusable()[0]?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const els = focusable();
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      previouslyFocused?.focus?.();
    };
  }, [open]);

  return (
    <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-3 lg:gap-5 min-w-0">
            <Link
              href="/calendar"
              className="font-bold text-zinc-50 text-lg whitespace-nowrap shrink-0"
            >
              🎸 Woodshed
            </Link>

            <div className="hidden lg:block">
              <BandSwitcher bands={bands} activeBandId={activeBandId} />
            </div>

            {/* Desktop nav */}
            <nav className="hidden lg:flex gap-1">
              {links.map(({ href, label, icon: Icon }) => {
                const badge = badgeFor(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={isActive(href) ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive(href)
                        ? "bg-blue-600/20 text-blue-400"
                        : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                    )}
                  >
                    <Icon size={16} />
                    {label}
                    {badge > 0 && (
                      <span className="ml-0.5 min-w-4 px-1 h-4 inline-flex items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-zinc-950">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Desktop user + sign out */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <span className="text-sm text-zinc-400">
              {user.name}
              {roleChip && (
                <span className="ml-1.5 text-xs bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded font-medium">
                  {roleChip}
                </span>
              )}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-200 transition-colors"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>

          {/* Mobile menu trigger */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="mobile-nav"
            className="lg:hidden -mr-2 p-2 text-zinc-300 hover:text-zinc-50 relative"
          >
            <Menu size={22} />
            {needsResponseCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            id="mobile-nav"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Main menu"
            className="absolute right-0 top-0 h-full w-72 max-w-[82vw] bg-zinc-900 border-l border-zinc-800 shadow-xl flex flex-col"
          >
            <div className="flex items-center justify-between h-16 px-4 border-b border-zinc-800">
              <span className="text-sm text-zinc-300">
                {user.name}
                {roleChip && (
                  <span className="ml-1.5 text-xs bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded font-medium">
                    {roleChip}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="-mr-2 p-2 text-zinc-400 hover:text-zinc-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-3 border-b border-zinc-800">
              <BandSwitcher bands={bands} activeBandId={activeBandId} variant="drawer" />
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {links.map(({ href, label, icon: Icon }) => {
                const badge = badgeFor(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive(href) ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                      isActive(href)
                        ? "bg-blue-600/20 text-blue-400"
                        : "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                    )}
                  >
                    <Icon size={18} />
                    <span className="flex-1">{label}</span>
                    {badge > 0 && (
                      <span className="min-w-5 px-1.5 h-5 inline-flex items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-zinc-950">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="p-3 border-t border-zinc-800">
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
              >
                <LogOut size={18} />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
