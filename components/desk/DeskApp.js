"use client";

import { PasscodeGate } from "@/components/AdminGate";
import RegistrationDesk from "./RegistrationDesk";
import { clearDeskPasscode } from "@/lib/store";
import { useAdminStatus } from "@/lib/hooks";

// Front desk: guest registration, behind its own password.
export default function DeskApp() {
  const status = useAdminStatus();
  if (!status) return <p className="muted center">Checking…</p>;
  if (status.deskAuthRequired && !status.deskAuthorized) return <PasscodeGate title="Registration" role="desk" />;
  return (
    <div className="stack">
      {status.storage === "memory" && (
        <p className="banner error">⚠️ No database connected — nothing is saved. Connect Upstash Redis in Vercel (Storage tab) and redeploy.</p>
      )}
      <div className="admin-bar">
        <h2 className="panel-title">🎟️ Registration</h2>
        <button className="btn small ghost" onClick={clearDeskPasscode}>
          Log out of registration
        </button>
      </div>
      <RegistrationDesk />
    </div>
  );
}
