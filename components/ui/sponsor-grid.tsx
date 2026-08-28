"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

export type Sponsor = {
  name: string;
  /** Chemin dans /public. Absent → monogramme + wordmark texte. */
  logo?: string;
  /** Ligne secondaire sous le nom (type de partenariat). */
  note?: string;
  href?: string;
};

type SponsorGridProps = {
  label?: string;
  sponsors: Sponsor[];
};

/**
 * Monogramme de repli : deux lettres tirées du nom, tant que les vrais logos
 * ne sont pas dans /public. Sans lui, une case sans fichier n'est qu'un mot
 * centré dans un cadre vide.
 */
function monogram(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/[\s'-]+/)
    .filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/** Rayon d'influence du curseur, en px : au-delà, une case ne bouge plus. */
const REACH = 340;
/** Hauteur maximale de soulèvement, en px. */
const LIFT = 42;
/** Inclinaison maximale, en degrés. */
const TILT = 9;

/**
 * Grille de partenaires réactive au curseur.
 *
 * Inspirée de l'Interactive Grid d'Originkit : survoler une case la soulève en
 * 3D, et ses voisines suivent avec moins d'amplitude. L'effet ne vient pas
 * d'un `:hover` par case — ça ferait une case qui saute et huit qui ne
 * bougent pas — mais d'une distance mesurée entre le pointeur et le centre de
 * chaque case, ce qui donne une surface souple plutôt que neuf boutons.
 *
 * Toute la géométrie est écrite en variables CSS, jamais en style JS pour
 * chaque propriété : une seule écriture par case et par frame, et la
 * transition, le repos et la version « mouvement réduit » restent gérés en
 * CSS, où ils sont lisibles.
 *
 * Une seule boucle rAF pour toute la grille, armée au mouvement et éteinte
 * dès que tout est revenu au repos.
 */
export function SponsorGrid({ label, sponsors }: SponsorGridProps) {
  const gridRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Un écran tactile n'a pas de survol : la grille resterait figée au repos
    // et on paierait quand même les écouteurs.
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const cells = Array.from(grid.children) as HTMLElement[];
    // Cible = ce que le pointeur demande, courant = ce qui est peint. L'écart
    // entre les deux est rattrapé par frame, d'où l'inertie douce quand le
    // curseur traverse vite.
    const state = cells.map(() => ({ lift: 0, rx: 0, ry: 0, lit: 0 }));
    const target = cells.map(() => ({ lift: 0, rx: 0, ry: 0, lit: 0 }));

    let rects: DOMRect[] = [];
    let gridRect: DOMRect | null = null;
    const measure = () => {
      gridRect = grid.getBoundingClientRect();
      rects = cells.map((cell) => cell.getBoundingClientRect());
    };

    let raf = 0;

    const frame = () => {
      let moving = false;
      for (let i = 0; i < cells.length; i++) {
        const s = state[i];
        const t = target[i];
        s.lift += (t.lift - s.lift) * 0.16;
        s.rx += (t.rx - s.rx) * 0.16;
        s.ry += (t.ry - s.ry) * 0.16;
        s.lit += (t.lit - s.lit) * 0.16;
        if (
          Math.abs(t.lift - s.lift) > 0.05 ||
          Math.abs(t.rx - s.rx) > 0.02 ||
          Math.abs(t.ry - s.ry) > 0.02 ||
          Math.abs(t.lit - s.lit) > 0.004
        ) {
          moving = true;
        }
        const cell = cells[i];
        cell.style.setProperty("--lift", `${s.lift.toFixed(2)}px`);
        cell.style.setProperty("--rx", `${s.rx.toFixed(2)}deg`);
        cell.style.setProperty("--ry", `${s.ry.toFixed(2)}deg`);
        cell.style.setProperty("--lit", s.lit.toFixed(3));
      }
      raf = moving ? requestAnimationFrame(frame) : 0;
    };
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const onMove = (event: PointerEvent) => {
      if (!gridRect) measure();
      for (let i = 0; i < cells.length; i++) {
        const rect = rects[i];
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = event.clientX - cx;
        const dy = event.clientY - cy;
        // Chute quadratique : la case sous le curseur monte franchement, ses
        // voisines suivent nettement moins. Une chute linéaire soulèverait un
        // plateau entier au lieu d'une bosse.
        const falloff = Math.max(0, 1 - Math.hypot(dx, dy) / REACH) ** 2;
        const t = target[i];
        t.lift = falloff * LIFT;
        t.lit = falloff;
        // La case s'oriente VERS le pointeur : le bord le plus proche descend,
        // comme une surface souple tirée par le curseur.
        t.ry = (dx / rect.width) * TILT * falloff;
        t.rx = (-dy / rect.height) * TILT * falloff;
        // Position du curseur DANS la case, pour le halo (en %, donc valable
        // même si la case est redimensionnée entre deux mesures).
        cells[i].style.setProperty("--sx", `${((event.clientX - rect.left) / rect.width) * 100}%`);
        cells[i].style.setProperty("--sy", `${((event.clientY - rect.top) / rect.height) * 100}%`);
      }
      wake();
    };

    const onLeave = () => {
      for (const t of target) {
        t.lift = 0;
        t.rx = 0;
        t.ry = 0;
        t.lit = 0;
      }
      wake();
    };

    measure();
    // Écouté sur la fenêtre et pas sur la grille : les cases doivent déjà
    // frémir quand le curseur approche par le dehors, sinon la bosse
    // apparaît d'un coup au passage du bord.
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [sponsors.length]);

  if (sponsors.length === 0) return null;

  return (
    <div className="sponsor-grid-wrap">
      {label && <p className="sponsor-grid-label">{label}</p>}
      <ul className="sponsor-grid" ref={gridRef}>
        {sponsors.map((sponsor) => {
          const inner = (
            <>
              <span className="sponsor-cell-sheen" aria-hidden="true" />
              {sponsor.logo ? (
                <Image
                  className="sponsor-logo"
                  src={sponsor.logo}
                  alt={sponsor.name}
                  width={220}
                  height={64}
                />
              ) : (
                <span className="sponsor-monogram" aria-hidden="true">
                  {monogram(sponsor.name)}
                </span>
              )}
              <span className="sponsor-cell-body">
                <span className="sponsor-wordmark">{sponsor.name}</span>
                {sponsor.note && <span className="sponsor-note">{sponsor.note}</span>}
              </span>
            </>
          );
          return (
            <li className="sponsor-cell" key={sponsor.name}>
              {sponsor.href ? (
                <a
                  className="sponsor-cell-link"
                  href={sponsor.href}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {inner}
                </a>
              ) : (
                inner
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default SponsorGrid;
