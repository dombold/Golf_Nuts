"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";

const navLinks = [
  { href: "/dashboard", label: "Home", icon: "🏠" },
  { href: "/rounds/new", label: "Play", icon: "⛳" },
  { href: "/courses", label: "Courses", icon: "🗺️" },
  { href: "/stats", label: "Stats", icon: "📊" },
  { href: "/friends", label: "Friends", icon: "👥" },
  { href: "/tournaments", label: "Events", icon: "🏆" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <>
      {/* Top bar */}
      <header className="bg-fairway-900 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/Golf_Nuts_Badge.jpg"
              alt="Golf Nuts"
              width={36}
              height={36}
              className="rounded-full"
            />
            <span className="font-bold text-lg tracking-tight">Golf Nuts</span>
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="text-fairway-300 hover:text-white text-sm transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      {/* Bottom tab bar (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-fairway-900 border-t border-fairway-800 md:hidden">
        <div className="grid grid-cols-6 h-14">
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
      </aside>
    </>
  );
}
