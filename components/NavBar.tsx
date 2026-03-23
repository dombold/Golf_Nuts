"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { logout } from "@/app/actions/auth";

const navLinks = [
  { href: "/dashboard", label: "Home", icon: "🏠" },
  { href: "/rounds/new", label: "Play", icon: "⛳" },
  { href: "/courses", label: "Courses", icon: "🗺️" },
  { href: "/stats", label: "Stats", icon: "📊" },
  { href: "/friends", label: "Friends", icon: "👥" },
  { href: "/tournaments", label: "Events", icon: "🏆" },
  { href: "/guide", label: "Guide", icon: "📖" },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function NavBar({ user }: { user: { name: string; username: string } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const initials = getInitials(user.name);

  return (
    <>
      {/* Top bar */}
      <header className="bg-fairway-900 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <img
              src="/golf_nuts_badge.jpg"
              alt="Golf Nuts"
              width={36}
              height={36}
              className="rounded-full"
            />
            <span className="font-bold text-lg tracking-tight">Golf Nuts</span>
          </Link>

          {/* Profile dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-fairway-600 hover:bg-fairway-500 text-white text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Open profile menu"
              aria-expanded={open}
            >
              {initials}
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                {/* User info header */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                  <p className="text-xs text-gray-500 truncate">@{user.username}</p>
                </div>

                <Link
                  href="/profile"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <span>👤</span>
                  View Profile
                </Link>

                <div className="border-t border-gray-100 mt-1 pt-1">
                  <form action={logout}>
                    <button
                      type="submit"
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                    >
                      <span>🚪</span>
                      Sign out
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Bottom tab bar (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-fairway-900 border-t border-fairway-800 md:hidden">
        <div className="grid grid-cols-7 h-14">
          {navLinks.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
                  active ? "text-fairway-300" : "text-fairway-600 hover:text-fairway-400"
                }`}
              >
                <span className="text-lg leading-none">{link.icon}</span>
                <span className="text-[10px]">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Side nav (desktop) */}
      <aside className="hidden md:flex flex-col gap-1 fixed left-0 top-14 bottom-0 w-52 bg-fairway-950 px-3 py-4 z-30">
        <div className="flex flex-col gap-1 flex-1">
          {navLinks.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-fairway-700 text-white"
                    : "text-fairway-400 hover:bg-fairway-800 hover:text-white"
                }`}
              >
                <span className="text-base">{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </div>
      </aside>
    </>
  );
}
