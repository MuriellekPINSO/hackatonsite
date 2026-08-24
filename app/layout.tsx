import type { Metadata } from "next";
import { googleSans } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tamebi Challenge 2026 — Le plus grand hackathon IA du Bénin | Tamebi",
  description:
    "30h pour déployer un LLM open-source de pointe sur un cluster 8×H200/B200, le servir via API et construire une application. Organisé par Tamebi, Cotonou, septembre 2026.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={googleSans.variable}>
      <body>
        {/* Fixed-position UI (the nav) is portaled here — outside ScrollSmoother's
            transformed content — because CSS `position:fixed` breaks once an
            ancestor has a transform applied to it. */}
        <div id="fixed-root" />
        <div id="smooth-wrapper">
          <div id="smooth-content">{children}</div>
        </div>
      </body>
    </html>
  );
}
