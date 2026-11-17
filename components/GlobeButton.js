"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Snow globe in the top-right corner: the way into the admin area.
export default function GlobeButton() {
  const active = usePathname().startsWith("/admin");
  return (
    <Link href="/admin" className={`globe-btn ${active ? "active" : ""}`} aria-label="Admin area" title="Admin area">
      <svg viewBox="0 0 64 72" aria-hidden="true">
        <defs>
          <radialGradient id="globeGlass" cx="38%" cy="32%" r="70%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="45%" stopColor="#a9dcff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#2b6fc2" stopOpacity="0.75" />
          </radialGradient>
        </defs>
        <circle cx="32" cy="30" r="26" fill="url(#globeGlass)" stroke="#e4f5ff" strokeWidth="2" />
        <path d="M18 40 L24 30 L30 40 Z M29 40 L37 25 L45 40 Z" fill="#f7fbff" opacity="0.95" />
        <path d="M14 42 Q32 34 50 42 Q46 50 32 52 Q18 50 14 42 Z" fill="#f7fbff" />
        <circle cx="22" cy="18" r="1.6" fill="#fff" />
        <circle cx="40" cy="14" r="1.3" fill="#fff" />
        <circle cx="46" cy="24" r="1.6" fill="#fff" />
        <circle cx="30" cy="22" r="1.1" fill="#fff" />
        <path d="M12 56 H52 L56 68 H8 Z" fill="#8b5a2b" stroke="#f6d98b" strokeWidth="2" strokeLinejoin="round" />
        <rect x="20" y="60" width="24" height="3" rx="1.5" fill="#f6d98b" />
      </svg>
    </Link>
  );
}
