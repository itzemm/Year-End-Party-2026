// Gently falling snow behind the page. Positions come from a fixed seed so the
// server and browser render identical markup.
const FLAKES = ["❄", "❅", "❆", "•", "•", "•"];

function seeded(i) {
  const x = Math.sin(i * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

export default function Snowfall({ count = 42 }) {
  return (
    <div className="sky" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const r = (k) => seeded(i * 7 + k);
        const size = 8 + r(1) * 18;
        return (
          <span
            key={i}
            className="flake"
            style={{
              left: `${r(2) * 100}%`,
              "--s": `${size}px`,
              "--o": (0.25 + r(3) * 0.55).toFixed(2),
              "--d": `${(10 + r(4) * 14).toFixed(1)}s`,
              "--delay": `-${(r(5) * 24).toFixed(1)}s`,
              "--drift": `${Math.round((r(6) - 0.5) * 80)}px`,
            }}
          >
            {FLAKES[i % FLAKES.length]}
          </span>
        );
      })}
    </div>
  );
}
