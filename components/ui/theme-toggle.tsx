"use client";

import { useEffect, useState } from "react";
import Sun from "reicon-react/icons/Sun";
import Moon from "reicon-react/icons/Moon";

/**
 * Bascule clair / sombre.
 *
 * Extraite de app/page.tsx, où elle était une fonction locale : les espaces
 * privés en ont besoin aussi, et deux implémentations de la même bascule
 * finissent toujours par diverger (une qui écrit `data-theme`, l'autre la
 * classe `.dark`, et un thème qui ne suit qu'à moitié).
 */
export function ThemeToggle({
  className,
  showLabel = false,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Lit le thème que le script bloquant de layout.tsx a déjà posé sur <html>.
  // Repoussé dans un effet (plutôt qu'un initialiseur paresseux de useState)
  // pour que le tout premier rendu client corresponde à celui du serveur :
  // sinon l'icône soleil/lune diverge et React signale l'hydratation.
  useEffect(() => {
    setTheme((document.documentElement.getAttribute("data-theme") as "light" | "dark") || "light");
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("tamebi-theme", next);
    } catch {}
  };

  return (
    <button
      type="button"
      className={className ? `theme-toggle ${className}` : "theme-toggle"}
      onClick={toggle}
      aria-label={theme === "dark" ? "Passer au thème clair" : "Passer au thème sombre"}
    >
      {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
      {showLabel && <span>{theme === "dark" ? "Thème clair" : "Thème sombre"}</span>}
    </button>
  );
}

export default ThemeToggle;
