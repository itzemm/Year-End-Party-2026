"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PrizeWheel from "./PrizeWheel";
import { Confetti } from "@/components/Confetti";
import { clearWinners, createPrize, deletePrize, drawWinner, fetchGuests, fetchPrizes, selectPrize } from "@/lib/store";
import { fileToImage, resizeToDataUrl } from "@/lib/imageTools";

export default function LuckyAdmin() {
  const [prizes, setPrizes] = useState(null);
  const [guests, setGuests] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [allowRepeat, setAllowRepeat] = useState(false);
  const [spin, setSpin] = useState(null); // { pool, winner, spinMs }
  const [revealed, setRevealed] = useState(null);
  const [error, setError] = useState("");
  const stageRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [p, g] = await Promise.all([fetchPrizes(), fetchGuests()]);
      setPrizes(p);
      setGuests(g);
    } catch (e) {
      setError(e.message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const selected = prizes?.find((p) => p.id === selectedId) || null;
  const wonTickets = new Set((prizes || []).filter((p) => p.winner).map((p) => p.winner.ticketNo));
  const eligible = allowRepeat ? guests : guests.filter((g) => !wonTickets.has(g.ticketNo));
  const wheelEntries = spin ? spin.pool : eligible.map((g) => ({ ticketNo: g.ticketNo, name: g.name }));

  async function choose(prize) {
    setError("");
    setSpin(null);
    setRevealed(null);
    setSelectedId(prize?.id || null);
    try {
      await selectPrize(prize?.id || null);
    } catch (e) {
      setError(e.message);
    }
  }

  async function draw() {
    if (!selected) return;
    if (selected.winner && !confirm(`${selected.name} was already won by ${selected.winner.name}. Draw again (e.g. they weren’t here)?`)) return;
    setError("");
    setRevealed(null);
    try {
      const res = await drawWinner(selected.id, allowRepeat);
      setSpin({ pool: res.pool, winner: res.winner, spinMs: res.spinMs, key: Date.now() });
    } catch (e) {
      setError(e.message);
    }
  }

  const spinning = spin && !revealed;
  const target = useMemo(() => (spin ? { ...spin.winner, key: spin.key } : null), [spin]);

  return (
    <div className="stack">
      <section className="panel host-screen lucky-stage" ref={stageRef}>
        {revealed && <Confetti key={revealed.drawnAt} />}
        <div className="panel-head">
          <h2 className="panel-title">🎁 Lucky Draw — host</h2>
          <button className="btn small ghost" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : stageRef.current?.requestFullscreen?.())}>
            ⛶ Big screen
          </button>
        </div>
        <div className="lucky-layout">
          <div className="lucky-prize">
            {selected ? (
              <>
                <p className="eyebrow">Now drawing for</p>
                {selected.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selected.imageUrl} alt="" className="prize-img" />
                ) : (
                  <div className="prize-img placeholder">🎁</div>
                )}
                <h3 className="prize-name">{selected.name}</h3>
              </>
            ) : (
              <p className="muted">Choose a prize from the list below to show it on everyone’s screen.</p>
            )}
            {revealed && (
              <div className="winner-card">
                <small>Winner</small>
                <b>{revealed.name}</b>
                <span className="mono">{revealed.ticketNo}</span>
              </div>
            )}
          </div>
          <div className="lucky-wheel">
            <PrizeWheel
              entries={wheelEntries}
              target={target}
              spinMs={spin?.spinMs || 9000}
              onStopped={() => {
                setRevealed(spin?.winner);
                load();
              }}
            />
            <div className="actions">
              <button className="btn primary big" onClick={draw} disabled={!selected || spinning || wheelEntries.length === 0}>
                {spinning ? "Spinning…" : "Spin the wheel!"}
              </button>
            </div>
            <label className="check center-text">
              <input type="checkbox" checked={allowRepeat} onChange={(e) => setAllowRepeat(e.target.checked)} disabled={spinning} />
              Let previous winners win again
            </label>
            <p className="muted small-print center">{eligible.length} guests on the wheel</p>
          </div>
        </div>
        {error && <p className="note error-text center">{error}</p>}
      </section>

      <PrizeManager prizes={prizes} selectedId={selectedId} onChoose={choose} onChanged={load} disabled={spinning} />
    </div>
  );
}

function PrizeManager({ prizes, selectedId, onChoose, onChanged, disabled }) {
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function pick(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setImage(resizeToDataUrl(await fileToImage(file), 700));
      if (!name) setName(file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim());
    } catch (err) {
      setNote(err.message);
    }
  }

  async function add(e) {
    e.preventDefault();
    setBusy(true);
    setNote("");
    try {
      await createPrize(name, image || null);
      setName("");
      setImage("");
      onChanged();
    } catch (err) {
      setNote(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(p) {
    if (!confirm(`Delete the prize “${p.name}”${p.winner ? ` (won by ${p.winner.name})` : ""}?`)) return;
    try {
      await deletePrize(p.id);
      if (p.id === selectedId) onChoose(null);
      onChanged();
    } catch (err) {
      setNote(err.message);
    }
  }

  async function clearAll() {
    if (!confirm("Clear all winners? Every prize can then be drawn again.")) return;
    await clearWinners().catch((err) => setNote(err.message));
    onChanged();
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2 className="panel-title">🏆 Prizes</h2>
        {prizes?.some((p) => p.winner) && (
          <button className="btn small ghost" onClick={clearAll} disabled={disabled}>
            Clear all winners
          </button>
        )}
      </div>
      <form className="prize-form" onSubmit={add}>
        <label className="prize-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {image ? <img src={image} alt="" /> : <span>+ Photo</span>}
          <input type="file" accept="image/*" hidden onChange={pick} />
        </label>
        <label>
          Prize name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Weekend getaway" maxLength={80} required />
        </label>
        <button className="btn primary" type="submit" disabled={busy || !name.trim()}>
          {busy ? "Adding…" : "Add prize"}
        </button>
      </form>
      {note && <p className="note">{note}</p>}
      {!prizes ? (
        <p className="muted">Loading…</p>
      ) : prizes.length === 0 ? (
        <p className="muted">No prizes yet — add the first one above.</p>
      ) : (
        <ul className="prize-list">
          {prizes.map((p) => (
            <li key={p.id} className={p.id === selectedId ? "selected" : ""}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.imageUrl ? <img src={p.imageUrl} alt="" /> : <span className="prize-thumb">🎁</span>}
              <div>
                <b>{p.name}</b>
                <small>{p.winner ? `Won by ${p.winner.name} (${p.winner.ticketNo})` : "Not drawn yet"}</small>
              </div>
              <button className={`btn small ${p.id === selectedId ? "primary" : ""}`} onClick={() => onChoose(p)} disabled={disabled}>
                {p.id === selectedId ? "On screen" : "Draw this"}
              </button>
              <button className="link danger" onClick={() => remove(p)} disabled={disabled}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
