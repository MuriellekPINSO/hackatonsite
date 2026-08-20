import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tamebi Challenge 2026 — Le plus grand hackathon IA du Bénin | Tamebi",
  description:
    "30h pour déployer un LLM open-source de pointe sur un cluster 8×H200/B200, le servir via API et construire une application. Organisé par Tamebi, Cotonou, septembre 2026.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
