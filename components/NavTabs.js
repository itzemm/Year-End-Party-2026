"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Registration", icon: "🎟️" },
  { href: "/games", label: "Games", icon: "🃏" },
  { href: "/lucky-draw", label: "Lucky Draw", icon: "🎩" },
];

export default function NavTabs() {
  const pathname = usePathname();
  return (
    <nav className="tabs" aria-label="Party sections">
      {TABS.map((tab) => {
        const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link key={tab.href} href={tab.href} className={`tab ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}>
            <span aria-hidden="true">{tab.icon}</span> {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
