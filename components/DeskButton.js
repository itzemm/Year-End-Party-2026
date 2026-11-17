"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Scanner icon in the top-left corner: the way into the front desk (check-in + registration).
export default function DeskButton() {
  const active = usePathname().startsWith("/desk");
  return (
    <Link href="/desk" className={`corner-btn desk-btn ${active ? "active" : ""}`} aria-label="Front desk: check-in and registration" title="Front desk: check-in & registration">
      <svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 15V9a3 3 0 0 1 3-3h6M33 6h6a3 3 0 0 1 3 3v6M42 33v6a3 3 0 0 1-3 3h-6M15 42H9a3 3 0 0 1-3-3v-6" />
        <rect x="14" y="14" width="8" height="8" rx="1.2" fill="currentColor" stroke="none" />
        <rect x="26" y="14" width="8" height="8" rx="1.2" fill="currentColor" stroke="none" opacity="0.75" />
        <rect x="14" y="26" width="8" height="8" rx="1.2" fill="currentColor" stroke="none" opacity="0.75" />
        <path d="M27 27h3v3h-3zM31 31h3v3h-3z" fill="currentColor" stroke="none" />
        <path d="M5 24h38" stroke="#f6d98b" strokeWidth="2.4" />
      </svg>
    </Link>
  );
}
