"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/admin/activity", label: "Activity" },
  { href: "/admin/rounds", label: "Rounds" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/audit", label: "Audit log" },
];

export default function AdminTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin sections" className="flex gap-1 overflow-x-auto border-b border-fairway-100">
      {tabs.map((t) => {
        const active = pathname === t.href || pathname.startsWith(t.href + "/");
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fairway-500 rounded-t-md ${
              active
                ? "border-fairway-700 text-fairway-900"
                : "border-transparent text-gray-500 hover:text-fairway-800 hover:border-fairway-200"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
