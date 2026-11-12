// The numbered treasure chests for the Smallest Unique Number reveal.
function ChestIcon({ open }) {
  return (
    <svg viewBox="0 0 64 52" className="chest-icon" aria-hidden="true">
      {open ? (
        <>
          <path d="M6 22 L14 4 H50 L58 22 Z" fill="#7a4a24" stroke="#f6d98b" strokeWidth="2.5" />
          <rect x="6" y="22" width="52" height="27" rx="3" fill="#8b5a2b" stroke="#f6d98b" strokeWidth="2.5" />
          <rect x="9" y="22" width="46" height="5" fill="#f6d98b" opacity="0.7" />
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

export default function ChestGrid({ numbers, opened, nextChest, onOpen, current, winner, myN, compact = false }) {
  return (
    <div className={`chest-grid ${compact ? "compact" : ""}`}>
      {numbers.map((n) => {
        const names = opened[n];
        const isOpen = names !== undefined;
        const cls = [
          "chest",
          isOpen ? "open" : "closed",
          isOpen && names.length === 1 ? "unique" : "",
          isOpen && names.length > 1 ? "dupe" : "",
          current?.n === n ? "current" : "",
          winner?.n === n ? "winner" : "",
          n === nextChest && onOpen ? "next" : "",
          n === myN ? "mine" : "",
        ].join(" ");
        const label = isOpen ? `${n}: ${names.length ? names.join(", ") : "nobody"}` : `Chest ${n}`;
        const content = (
          <>
            <ChestIcon open={isOpen} />
            <span className="chest-n">{n}</span>
            {isOpen && !compact && (
              <span className="chest-names">{names.length ? names.join(", ") : "empty"}</span>
            )}
            {isOpen && compact && names.length > 0 && <span className="chest-count">{names.length}</span>}
          </>
        );
        return onOpen ? (
          <button key={n} className={cls} title={label} onClick={() => n === nextChest && onOpen(n)} disabled={isOpen || n !== nextChest}>
            {content}
          </button>
        ) : (
          <div key={n} className={cls} title={label}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
