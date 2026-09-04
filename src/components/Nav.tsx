"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Calendar,
  CalendarDays,
  ChevronDown,
  List,
  Mic,
  Users,
  Music,
  Disc3,
  UserX,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import BandSwitcher, { type NavBand } from "./BandSwitcher";
import { ThemeMenu, ThemeToggle, useTheme, type Theme } from "./ThemeMenu";

interface NavProps {
  user: { name: string; email: string; role: string };
  bands: NavBand[];
  activeBandId: string;
  needsResponseCount?: number;
  /** Server-rendered appearance from the `theme` cookie; seeds the client hook. */
  theme: Theme;
}

// Shows, practices, and recordings are one model (`Show`) discriminated by
// `type`; they're grouped under one "Events" nav parent.
const EVENT_LINKS = [
  { href: "/shows", label: "Shows", icon: List },
  { href: "/practices", label: "Practices", icon: Users },
  { href: "/recordings", label: "Recordings", icon: Mic },
];

const PRIMARY_LINK = { href: "/calendar", label: "Calendar", icon: Calendar };

const SECONDARY_LINKS = [
  { href: "/songs", label: "Songs", icon: Music },
  { href: "/releases", label: "Releases", icon: Disc3 },
  { href: "/my-availability", label: "My Availability", icon: UserX },
];

const pathMatches = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

/** Desktop-only "Events ▾" dropdown grouping the three event list routes. */
function EventsMenu({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = EVENT_LINKS.some((l) => pathMatches(pathname, l.href));

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
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
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
          active
            ? "bg-blue-600/20 text-blue-400"
            : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        )}
      >
        <CalendarDays size={16} />
        Events
        <ChevronDown
          size={14}
          className={cn("shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 mt-1 w-48 z-50 rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl py-1"
        >
          {EVENT_LINKS.map(({ href, label, icon: Icon }) => {
            const isActive = pathMatches(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                role="menuitem"
                onClick={() => setOpen(false)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "text-blue-400"
                    : "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Nav({
  user,
  bands,
  activeBandId,
  needsResponseCount = 0,
  theme: initialTheme,
}: NavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  // Nav stays mounted for the whole session, so the theme choice is owned here
  // rather than inside the conditionally-mounted menu/drawer.
  const [theme, setTheme] = useTheme(initialTheme);

  const activeRole = bands.find((b) => b.id === activeBandId)?.role;
  const roleChip =
    activeRole === "OWNER" ? "Owner" : activeRole === "ADMIN" ? "Admin" : null;

  const badgeFor = (href: string) =>
    href === "/my-availability" && needsResponseCount > 0 ? needsResponseCount : 0;
  const isActive = (href: string) => pathMatches(pathname, href);

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

  const drawerLink = ({
    href,
    label,
    icon: Icon,
  }: {
    href: string;
    label: string;
    icon: typeof Calendar;
  }) => {
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
          <span className="min-w-5 px-1.5 h-5 inline-flex items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-amber-950">
            {badge}
          </span>
        )}
      </Link>
    );
  };

  const desktopLink = ({
    href,
    label,
    icon: Icon,
  }: {
    href: string;
    label: string;
    icon: typeof Calendar;
  }) => {
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
          <span className="ml-0.5 min-w-4 px-1 h-4 inline-flex items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-amber-950">
            {badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-3 lg:gap-5 min-w-0">
            <Link
              href="/calendar"
              className="font-bold text-zinc-50 text-lg whitespace-nowrap shrink-0"
            >
              Woodshed
            </Link>

            <div className="hidden lg:block">
              <BandSwitcher bands={bands} activeBandId={activeBandId} />
            </div>

            {/* Desktop nav */}
            <nav className="hidden lg:flex gap-1">
              {desktopLink(PRIMARY_LINK)}
              <EventsMenu pathname={pathname} />
              {SECONDARY_LINKS.map(desktopLink)}
            </nav>
          </div>

          {/* Desktop account menu (appearance + sign out) */}
          <div className="hidden lg:flex items-center shrink-0">
            <ThemeMenu
              user={user}
              roleChip={roleChip}
              theme={theme}
              onThemeChange={setTheme}
            />
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
              {drawerLink(PRIMARY_LINK)}

              {/* Events broken out as siblings on mobile — a nested disclosure
                  here would be more fiddly than it's worth. */}
              <div className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Events
              </div>
              {EVENT_LINKS.map(drawerLink)}

              <div className="pt-2" />
              {SECONDARY_LINKS.map(drawerLink)}
            </nav>

            <div className="p-3 border-t border-zinc-800 space-y-3">
              <div className="px-1">
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  Appearance
                </div>
                <ThemeToggle
                  className="w-full"
                  theme={theme}
                  onChange={setTheme}
                />
              </div>
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
