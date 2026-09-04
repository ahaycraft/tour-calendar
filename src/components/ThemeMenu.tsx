"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { signOut } from "next-auth/react";
import { ChevronDown, LogOut, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export type Theme = "light" | "dark";

const COOKIE_KEY = "theme";
const ONE_YEAR = 60 * 60 * 24 * 365;

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

/**
 * Owns the light|dark choice from hydration onward. The initial value is passed
 * in from the server, which read the `theme` cookie and rendered it into
 * <html data-theme>, so there's nothing to reconcile on hydration. On change
 * this writes the cookie (so the next server render matches), updates <html> in
 * place, and broadcasts to other open tabs. It also re-asserts <html data-theme>
 * after React's dev-only Strict Mode remount.
 */
function useTheme(initial: Theme): [Theme, (next: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(initial);

  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(COOKIE_KEY);
    channel.onmessage = (e) => {
      if (e.data === "light" || e.data === "dark") setThemeState(e.data);
    };
    return () => channel.close();
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    document.cookie = `${COOKIE_KEY}=${next}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(COOKIE_KEY);
      channel.postMessage(next);
      channel.close();
    }
  }, []);

  return [theme, setTheme];
}

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

/** Segmented Light / Dark control. Used in the desktop menu and mobile drawer. */
export function ThemeToggle({
  className,
  initialTheme,
}: {
  className?: string;
  initialTheme: Theme;
}) {
  const [theme, setTheme] = useTheme(initialTheme);

  return (
    <div
      role="radiogroup"
      aria-label="Appearance"
      className={cn(
        "inline-flex rounded-lg border border-zinc-700 bg-zinc-800/50 p-0.5",
        className
      )}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(value)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-zinc-700 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-100"
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Desktop nav account menu: the user's name opens a dropdown with the
 * appearance toggle and sign out.
 */
export function ThemeMenu({
  user,
  roleChip,
  initialTheme,
}: {
  user: { name: string };
  roleChip: string | null;
  initialTheme: Theme;
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
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
      >
        <span className="whitespace-nowrap">{user.name}</span>
        {roleChip && (
          <span className="text-xs bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded font-medium">
            {roleChip}
          </span>
        )}
        <ChevronDown
          size={14}
          className={cn(
            "shrink-0 text-zinc-500 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1 w-56 z-50 rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl py-1"
        >
          <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
            Appearance
          </div>
          <div className="px-3 pb-1.5">
            <ThemeToggle className="w-full" initialTheme={initialTheme} />
          </div>
          <div className="my-1 border-t border-zinc-800" />
          <button
            type="button"
            role="menuitem"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
