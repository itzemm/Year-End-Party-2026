"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import TicketCard from "@/components/TicketCard";
import { decodeTicket } from "@/lib/store";

function TicketView() {
  const params = useSearchParams();
  const guest = decodeTicket(params.get("t") || "");

  if (!guest) {
    return (
      <div className="panel empty">
        <p className="big-emoji" aria-hidden="true">🌨️</p>
        <p>This ticket has melted away like snow. Please scan a valid QR code.</p>
        <Link className="btn" href="/">
          Back to registration
        </Link>
      </div>
    );
  }

  return (
    <div className="ticket-page">
      <p className="muted center">Present this at the door — and keep your number for the lucky draw!</p>
      <TicketCard guest={guest} />
    </div>
  );
}

export default function TicketPage() {
  return (
    <Suspense fallback={<p className="muted center">Shaking the snow globe…</p>}>
      <TicketView />
    </Suspense>
  );
}
