// Chests 1–100 for Smallest Unique Number. Chests of numbers somebody picked glow;
// opened ones show how many picked them.
function ChestIcon({ open }) {
  return (
    <svg viewBox="0 0 64 52" className="chest-icon" aria-hidden="true">
      {open ? (
        <>
          <path d="M6 22 L14 4 H50 L58 22 Z" fill="#7a4a24" stroke="#f6d98b" strokeWidth="2.5" />
          <rect x="6" y="22" width="52" height="27" rx="3" fill="#8b5a2b" stroke="#f6d98b" strokeWidth="2.5" />
          <rect x="9" y="22" width="46" height="5" fill="#f6d98b" opacity="0.8" />
        </>
      ) : (
        <>
          <path d="M6 22 Q6 6 32 6 Q58 6 58 22 Z" fill="#8b5a2b" stroke="#f6d98b" strokeWidth="2.5" />
          <rect x="6" y="22" width="52" height="27" rx="3" fill="#7a4a24" stroke="#f6d98b" strokeWidth="2.5" />
          <rect x="27" y="17" width="10" height="13" rx="2" fill="#f6d98b" />
        </>
      )}
    </svg>
  );
}

export { ChestIcon };

const ALL = Array.from({ length: 100 }, (_, i) => i + 1);

export default function ChestGrid({ picked, opened, onOpen, current, winner }) {
  const lit = new Set(picked);
  return (
    <div className="chest-grid">
      {ALL.map((n) => {
        const names = opened[n];
        const isOpen = names !== undefined;
        const cls = [
          "chest",
          lit.has(n) ? "lit" : "dark",
          isOpen ? "open" : "",
          isOpen && names.length === 1 ? "unique" : "",
          isOpen && names.length > 1 ? "dupe" : "",
          current?.n === n ? "current" : "",
          winner?.n === n ? "winner" : "",
        ].join(" ");
        return (
          <button key={n} className={cls} onClick={() => lit.has(n) && onOpen(n)} disabled={!lit.has(n)} title={lit.has(n) ? `Open chest ${n}` : `Nobody picked ${n}`}>
            <ChestIcon open={isOpen} />
            <span className="chest-n">{n}</span>
            {isOpen && <span className="chest-count">{names.length}</span>}
          </button>
        );
      })}
    </div>
  );
}
