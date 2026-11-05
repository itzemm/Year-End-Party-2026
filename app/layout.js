import "./globals.css";
import NavTabs from "@/components/NavTabs";

export const metadata = {
  title: "Down the Rabbit Hole · Year End Party 2026",
  description: "Registration, games and lucky draw for our Alice in Wonderland year end party.",
};

export const viewport = {
  themeColor: "#1b1033",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="sky" aria-hidden="true">
          <span className="float f1">♠</span>
          <span className="float f2">♥</span>
          <span className="float f3">🫖</span>
          <span className="float f4">♦</span>
          <span className="float f5">🕰️</span>
          <span className="float f6">♣</span>
        </div>
        <header className="site-header">
          <p className="eyebrow">Year End Party 2026</p>
          <h1 className="title">Down the Rabbit Hole</h1>
          <p className="tagline">“We’re all mad here.” — an evening in Wonderland</p>
          <NavTabs />
        </header>
        <main className="page">{children}</main>
        <footer className="site-footer">
          <span>♠ ♥ ♣ ♦</span>
          <span>Curiouser and curiouser…</span>
        </footer>
      </body>
    </html>
  );
}
