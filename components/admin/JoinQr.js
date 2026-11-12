"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

// QR for the big screen so guests can jump straight to a game on their phone.
export default function JoinQr({ path, label }) {
  const [qr, setQr] = useState("");
  const [url, setUrl] = useState("");
  useEffect(() => {
    const full = `${window.location.origin}${path}`;
    setUrl(full);
    QRCode.toDataURL(full, { margin: 1, width: 360, color: { dark: "#0b1d3a", light: "#f7fbff" } }).then(setQr).catch(() => {});
  }, [path]);
  return (
    <div className="join-box">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {qr && <img src={qr} alt={label} />}
      <p className="small-print">
        {label}
        <br />
        {url.replace(/^https?:\/\//, "")}
      </p>
    </div>
  );
}
