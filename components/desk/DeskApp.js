"use client";

import { useEffect, useState } from "react";
import { PasscodeGate } from "@/components/AdminGate";
import CheckIn from "./CheckIn";
import RegistrationDesk from "./RegistrationDesk";
import { clearDeskPasscode } from "@/lib/store";
import { useAdminStatus } from "@/lib/hooks";

const SECTIONS = [
  { id: "checkin", label: "Check-in", icon: "📷", Component: CheckIn },
  { id: "registration", label: "Registration", icon: "🎟️", Component: RegistrationDesk },
];

// Front desk: registration and check-in, behind its own password.
export default function DeskApp() {
  const status = useAdminStatus();
  const [active, setActive] = useState("checkin");

  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("section");
    if (SECTIONS.some((s) => s.id === wanted)) setActive(wanted);
  }, []);

  function choose(id) {
    setActive(id);
    const url = new URL(window.location.href);
    url.searchParams.set("section", id);
    window.history.replaceState(null, "", url);
  }

  if (!status) return <p className="muted center">Checking…</p>;
  if (status.deskAuthRequired && !status.deskAuthorized) return <PasscodeGate title="Front desk" role="desk" />;

  const { Component } = SECTIONS.find((s) => s.id === active);
  return (
    <div className="stack">
      {!status.deskAuthRequired && (
        <p className="banner error">
          ⚠️ No front desk password is set, so anyone can open this page. In Vercel, add <b>REGISTRATION_PASSCODE</b> (and <b>ADMIN_PASSCODE</b>) and
          redeploy.
        </p>
      )}
      {status.storage === "memory" && (
        <p className="banner error">⚠️ No database connected — nothing is saved. Connect Upstash Redis in Vercel (Storage tab) and redeploy.</p>
      )}
      <div className="admin-bar">
        <div className="subtabs" role="tablist">
          {SECTIONS.map((s) => (
            <button key={s.id} role="tab" aria-selected={active === s.id} className={`subtab ${active === s.id ? "active" : ""}`} onClick={() => choose(s.id)}>
              <span aria-hidden="true">{s.icon}</span> {s.label}
            </button>
          ))}
        </div>
        {status.deskAuthRequired && (
          <button className="btn small ghost" onClick={clearDeskPasscode}>
            Log out
          </button>
        )}
      </div>
      <Component />
    </div>
  );
}
