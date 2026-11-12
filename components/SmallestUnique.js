"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { fetchStatus, fetchSun, fetchSunMe, hostSun, submitSun } from "@/lib/store";
import { PasscodeGate } from "@/components/AdminGate";

// Everyone picks a whole number; the smallest number that nobody else picked wins.
// Guests play on their phones (logged in via My Ticket). The host opens and closes
// rounds and shows the live count + results on the big screen.

export default function SmallestUnique() {
  const [round, setRound] = useState(undefined); // undefined = loading
  const [me, setMe] = useState(null);
  const [hostMode, setHostMode] = useState(false);
  const [loadError, setLoadError] = useState("");
  const roundKey = round ? `${round.id}:${round.status}` : "none";
  const statusRef = useRef(null);
  statusRef.current = round?.status;

  // Poll the shared round state: quickly while a round is open, slowly otherwise.
  useEffect(() => {
    let timer;
    let stopped = false;
    async function tick() {
      try {
        const data = await fetchSun();
        if (!stopped) {
          setRound(data.round);
          setLoadError("");
        }
      } catch {
        if (!stopped) setLoadError("Connection hiccup — retrying…");
      }
      if (stopped) return;
      // 120 phones × one check every few seconds is light, and the CDN absorbs most of it.
      const busy = statusRef.current === "open" || statusRef.current === "closing";
      const delay = document.visibilityState !== "visible" ? 20000 : busy ? 4000 : 8000;
      timer = setTimeout(tick, delay);
    }
    tick();
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        tick();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const loadMe = useCallback(() => fetchSunMe().then(setMe).catch(() => {}), []);
  const refreshRound = useCallback(() => fetchSun().then((d) => setRound(d.round)).catch(() => {}), []);

  // Re-check the guest's own entry whenever the round opens, closes or changes.
  useEffect(() => {
    loadMe();
  }, [roundKey, loadMe]);

  if (round === undefined) return <p className="muted center">Shaking the snow globe…</p>;

  return (
    <div className="sun-game">
      <div className="sun-rules">
        <p>
          Pick a whole number. The <b>smallest number that nobody else picked</b> wins. Pick 1 and you might win… or tie with
          everyone else who had the same idea.
        </p>
      </div>
      {loadError && <p className="note">{loadError}</p>}

      {hostMode ? (
        <HostPanel round={round} onRound={setRound} onExit={() => setHostMode(false)} />
      ) : (
        <PlayerPanel
          round={round}
          me={me}
          onSubmitted={(entry) => {
            setMe((m) => ({ ...m, roundId: round?.id, entry }));
            refreshRound();
          }}
        />
      )}

      {!hostMode && (
        <p className="center">
          <button className="link" onClick={() => setHostMode(true)}>
            Host controls
          </button>
        </p>
      )}
    </div>
  );
}

function PlayerPanel({ round, me, onSubmitted }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const myEntry = me?.roundId === round?.id ? me?.entry : null;

  if (me && !me.loggedIn) {
    return (
      <div className="panel-inner empty">
        <p className="big-emoji" aria-hidden="true">🔑</p>
        <p>Log in with your ticket to play — one number per guest.</p>
        <Link className="btn primary" href="/my-ticket?next=/games?game=sun">
          Log in on My Ticket
        </Link>
      </div>
    );
  }

  if (!round) {
    return (
      <div className="panel-inner empty">
        <p className="big-emoji" aria-hidden="true">⛄</p>
        <p>Waiting for the host to start the first round…</p>
      </div>
    );
  }

  if (round.status === "closing") {
    return (
      <div className="panel-inner empty">
        <p className="big-emoji spin" aria-hidden="true">❄️</p>
        <p>Round {round.id} is closed — counting the snowflakes…</p>
      </div>
    );
  }

  if (round.status === "closed") {
    return (
      <div className="panel-inner">
        <h3 className="sun-heading">Round {round.id} results</h3>
        <SunResult result={round.result} myN={myEntry?.n} />
        <p className="muted center small-print">Stay on this page — the next round will appear here.</p>
      </div>
    );
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1 || n > round.max) {
      setError(`Pick a whole number from 1 to ${round.max}.`);
      return;
    }
    setBusy(true);
    try {
      const { entry } = await submitSun(n);
      onSubmitted(entry);
      setValue("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel-inner">
      <h3 className="sun-heading">
        Round {round.id} is open <span className="live-dot" aria-hidden="true" />
      </h3>
      <p className="muted center">
        {me?.name ? `Playing as ${me.name}. ` : ""}Pick from 1 to {round.max}. {round.entryCount} guest{round.entryCount === 1 ? " has" : "s have"} entered.
      </p>
      {myEntry && (
        <p className="my-pick">
          Your number: <b>{myEntry.n}</b>
          <small>You can change it until the host closes the round.</small>
        </p>
      )}
      <form className="sun-form" onSubmit={submit}>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={round.max}
          step={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={myEntry ? "New no." : "1–" + round.max}
          aria-label="Your number"
          required
        />
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? "Sending…" : myEntry ? "Change my number" : "Lock it in"}
        </button>
      </form>
      {error && <p className="note error-text center">{error}</p>}
    </div>
  );
}

function HostPanel({ round, onRound, onExit }) {
  const [auth, setAuth] = useState(null);
  const [max, setMax] = useState(100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [qr, setQr] = useState("");
  const [joinUrl, setJoinUrl] = useState("");
  const stageRef = useRef(null);

  useEffect(() => {
    const check = () => fetchStatus().then(setAuth).catch(() => setAuth({ authorized: false, authRequired: true }));
    check();
    window.addEventListener("wonderland-store", check);
    return () => window.removeEventListener("wonderland-store", check);
  }, []);

  useEffect(() => {
    const url = `${window.location.origin}/games?game=sun`;
    setJoinUrl(url);
    QRCode.toDataURL(url, { margin: 1, width: 360, color: { dark: "#0b1d3a", light: "#f7fbff" } }).then(setQr).catch(() => {});
  }, []);

  if (!auth) return <p className="muted center">Checking…</p>;
  if (auth.authRequired && !auth.authorized) {
    return (
      <>
        <PasscodeGate />
        <p className="center">
          <button className="link" onClick={onExit}>
            Back to playing
          </button>
        </p>
      </>
    );
  }

  async function act(action) {
    if (action === "open" && round?.status === "open" && !confirm("A round is still open. Discard it and start a new one?")) return;
    setBusy(true);
    setError("");
    try {
      const { round: r } = await hostSun(action, max);
      onRound(r);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else stageRef.current?.requestFullscreen?.();
  }

  const status = round?.status;

  return (
    <div className="panel-inner host-panel" ref={stageRef}>
      <div className="host-top">
        <div className="join-box">
          {qr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR code to join the game" />
          )}
          <p className="small-print">Scan to play · {joinUrl.replace(/^https?:\/\//, "")}</p>
        </div>
        <div className="host-status">
          <p className="eyebrow">{round ? `Round ${round.id}` : "No round yet"}</p>
          <p className="host-count">{round ? round.entryCount : 0}</p>
          <p className="muted">
            {status === "open" ? `guests have picked a number (1–${round.max})` : status === "closed" ? "guests played" : "guests"}
          </p>
          {status === "open" && <span className="live-pill">Round open — waiting for picks</span>}
          {status === "closing" && <span className="live-pill">Counting…</span>}
        </div>
      </div>

      {status === "closed" && <SunResult result={round.result} big />}

      <div className="host-controls">
        {status === "open" ? (
          <button className="btn primary big" onClick={() => act("close")} disabled={busy}>
            {busy ? "Counting…" : "Close round & reveal"}
          </button>
        ) : (
          <>
            <label className="max-input">
              Numbers from 1 to
              <input type="number" min={2} max={9999} value={max} onChange={(e) => setMax(e.target.value)} />
            </label>
            <button className="btn primary big" onClick={() => act("open")} disabled={busy || status === "closing"}>
              {round ? "Start next round" : "Start round 1"}
            </button>
          </>
        )}
        <button className="btn ghost small" onClick={toggleFullscreen}>
          ⛶ Big screen
        </button>
        <button className="btn ghost small" onClick={onExit}>
          Exit host mode
        </button>
      </div>
      {error && <p className="note error-text center">{error}</p>}
    </div>
  );
}

function SunResult({ result, myN, big = false }) {
  if (!result) return null;
  const { winner, histogram, total } = result;
  const maxCount = Math.max(1, ...histogram.map((h) => h.count));
  const mine = myN != null ? histogram.find((h) => h.n === myN) : null;

  let outcome = null;
  if (myN != null) {
    if (winner && winner.n === myN) outcome = "🎉 That’s you — your number was the smallest unique one!";
    else if (mine && mine.count > 1) outcome = `Your ${myN} was also picked by ${mine.count - 1} other guest${mine.count === 2 ? "" : "s"}.`;
    else if (winner) outcome = `Your ${myN} was unique, but ${winner.n} was smaller.`;
    else outcome = `You picked ${myN}.`;
  } else if (!big) {
    outcome = "You didn’t play this round.";
  }

  return (
    <div className={`sun-result ${big ? "big" : ""}`}>
      {total === 0 ? (
        <p className="sun-winner">Nobody played this round.</p>
      ) : winner ? (
        <div className="sun-winner">
          <span className="sun-winner-n">{winner.n}</span>
          <div>
            <b>{winner.name}</b> wins!
            <small>
              {winner.ticketNo} · {total} guest{total === 1 ? "" : "s"} played
            </small>
          </div>
        </div>
      ) : (
        <p className="sun-winner">No unique number this round — nobody wins! ❄</p>
      )}
      {outcome && <p className={`my-outcome ${winner && winner.n === myN ? "won" : ""}`}>{outcome}</p>}

      {histogram.length > 0 && (
        <>
          <div className="sun-chart" role="img" aria-label="How many guests picked each number">
            {histogram.map((h) => (
              <div
                key={h.n}
                className={`sun-bar ${h.count === 1 ? "unique" : ""} ${winner?.n === h.n ? "winner" : ""} ${myN === h.n ? "mine" : ""}`}
                title={`${h.n}: picked by ${h.count}`}
              >
                <span className="sun-bar-count">{h.count}</span>
                <span className="sun-bar-fill" style={{ height: `${(h.count / maxCount) * 100}%` }} />
                <span className="sun-bar-n">{h.n}</span>
              </div>
            ))}
          </div>
          <p className="muted small-print center">
            Bars show how many guests picked each number. <span className="key unique">Unique</span>{" "}
            <span className="key winner">Winner</span>
            {myN != null && <span className="key mine">Yours</span>}
          </p>
        </>
      )}
    </div>
  );
}
