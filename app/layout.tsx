import type { Metadata } from "next";
import { googleSans } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tamebi Challenge 2026 : Le plus grand hackathon IA du Bénin | Tamebi",
  description:
    "30h pour déployer un LLM open-source de pointe sur un cluster 8×H200/B200, le servir via API et construire une application. Organisé par Tamebi, Cotonou, septembre 2026.",
};

// Blocking, runs before first paint so the page never flashes the wrong
// theme: reads the saved choice (or the OS preference the first time) and
// stamps it on <html> before React hydrates. Sets both data-theme (our own
// CSS variables in globals.css) and the "dark" class (Tailwind's darkMode:
// "class" strategy, used by the shadcn-derived components) so both systems
// stay in sync from a single source of truth.
const themeInitScript = `(function(){try{
  var stored = localStorage.getItem("tamebi-theme");
  var theme = stored || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.classList.toggle("dark", theme === "dark");
}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={googleSans.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        {/* Fixed-position UI (the nav) is portaled here (outside ScrollSmoother's
            transformed content) because CSS `position:fixed` breaks once an
            ancestor has a transform applied to it. */}
        <div id="fixed-root" />
        <div id="smooth-wrapper">
          <div id="smooth-content">{children}</div>
        </div>
      </body>
    </html>
  );
}
