import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Espaces · Tamebi Challenge 2026",
  // Les quatre espaces sont privés : rien ici n'a vocation à sortir dans un
  // moteur de recherche, même pendant la phase de maquette où les pages ne
  // sont pas encore derrière une authentification.
  robots: { index: false, follow: false },
};

export default function EspaceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
