"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Calendar, List, UserX, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavProps {
  user: { name: string; email: string; role: string };
}

const links = [
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/shows", label: "Shows", icon: List },
  { href: "/my-availability", label: "My Availability", icon: UserX },
];

export default function Nav({ user }: NavProps) {
  const pathname = usePathname();

  return (
    <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/calendar" className="font-bold text-zinc-50 text-lg">
              🎸 Tour Cal
            </Link>

            <nav className="hidden sm:flex gap-1">
              {links.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    pathname.startsWith(href)
                      ? "bg-blue-600/20 text-blue-400"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                  )}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-400 hidden sm:block">
              {user.name}
              {user.role === "ADMIN" && (
                <span className="ml-1.5 text-xs bg-blue-600/20 text-blue-400 px-1.5 py-0.5 rounded font-medium">
                  Admin
                </span>
              )}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-200 transition-colors"
            >
              <LogOut size={16} />
              <span className="hidden sm:block">Sign out</span>
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="flex sm:hidden gap-1 pb-2">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors",
                pathname.startsWith(href)
                  ? "bg-blue-600/20 text-blue-400"
                  : "text-zinc-400 hover:bg-zinc-800"
              )}
            >
              <Icon size={14} />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
