"use client";

import { useEffect, useState } from "react";
import { PasscodeGate } from "@/components/AdminGate";
import RegistrationAdmin from "./RegistrationAdmin";
import ZoomAdmin from "./ZoomAdmin";
import SunAdmin from "./SunAdmin";
import LuckyAdmin from "./LuckyAdmin";
import { clearPasscode } from "@/lib/store";
import { useAdminStatus } from "@/lib/hooks";

const SECTIONS = [
  { id: "registration", label: "Registration", icon: "🎟️", Component: RegistrationAdmin },
  { id: "zoom", label: "Guess the Item", icon: "🔍", Component: ZoomAdmin },
  { id: "sun", label: "Smallest Unique Number", icon: "🔢", Component: SunAdmin },
  { id: "lucky", label: "Lucky Draw", icon: "🎁", Component: LuckyAdmin },
];

export default function AdminApp() {
  const status = useAdminStatus();
  const [active, setActive] = useState("registration");

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
  if (status.authRequired && !status.authorized) return <PasscodeGate title="Admin area" />;

  const { Component } = SECTIONS.find((s) => s.id === active);
  return (
    <div className="stack">
      {!status.authRequired && (
        <p className="banner error">
          ⚠️ No admin password is set, so anyone can open this page. In Vercel, add an <b>ADMIN_PASSCODE</b> environment variable and
          redeploy.
        </p>
      )}
      {status.storage === "memory" && (
        <p className="banner error">
          ⚠️ No database connected — everything is kept in temporary memory and <b>will be lost</b>. Connect Upstash Redis in Vercel
          (Storage tab) and redeploy.
        </p>
      )}
      <div className="admin-bar">
        <div className="subtabs" role="tablist">
          {SECTIONS.map((s) => (
            <button key={s.id} role="tab" aria-selected={active === s.id} className={`subtab ${active === s.id ? "active" : ""}`} onClick={() => choose(s.id)}>
              <span aria-hidden="true">{s.icon}</span> {s.label}
            </button>
          ))}
        </div>
        {status.authRequired && (
          <button className="btn small ghost" onClick={clearPasscode}>
            Log out
          </button>
        )}
      </div>
      <Component />
    </div>
  );
}
