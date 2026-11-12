import "./globals.css";
import NavTabs from "@/components/NavTabs";
import Snowfall from "@/components/Snowfall";
import GlobeButton from "@/components/GlobeButton";

export const metadata = {
  title: "Winter Wonderland · Year End Party 2026",
  description: "Registration, games and lucky draw for our Winter Wonderland year end party.",
};

export const viewport = {
  themeColor: "#061328",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Snowfall />
        <GlobeButton />
        <header className="site-header">
          <p className="eyebrow">Year End Party 2026</p>
          <h1 className="title">Winter Wonderland</h1>
          <p className="tagline">An evening of frost, fairy lights and good cheer</p>
          <NavTabs />
        </header>
        <main className="page">{children}</main>
        <footer className="site-footer">
          <span>❄ ❅ ❆</span>
          <span>Let it snow, let it snow, let it snow…</span>
        </footer>
      </body>
    </html>
  );
}
