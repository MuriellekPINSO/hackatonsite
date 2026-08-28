"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Nombre en odomètre : chaque chiffre est une colonne 0→9 qui roule jusqu'à
 * la bonne position.
 *
 * Aucune boucle d'animation : c'est une transition CSS sur un `translateY`, ce
 * qui veut dire que le compositeur s'en occupe et que douze totaux qui bougent
 * en même temps ne coûtent rien. Un compteur en rAF ferait un `setState` par
 * frame et par nombre.
 *
 * Le chiffre exact est aussi rendu en clair pour les lecteurs d'écran et pour
 * le HTML servi par Next : les colonnes, elles, sont décoratives.
 *
 * Deux moments déclenchent un roulement :
 *  - l'entrée dans le viewport, depuis 0 : le score « se remplit » quand le
 *    visiteur arrive sur la section ;
 *  - tout changement de `value` ensuite. Le jury ajoute deux points, les
 *    unités roulent de deux : le relevé toutes les 20 s devient lisible sans
 *    avoir à comparer de mémoire.
 */
type RollingNumberProps = {
  value: number;
  /** Durée du roulement, en ms. */
  duration?: number;
  className?: string;
};

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function RollingNumber({ value, duration = 900, className }: RollingNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  // Tant que `armed` est faux, les colonnes sont posées sur 0 SANS transition.
  // La structure a donc déjà le bon nombre de chiffres au premier rendu, et
  // l'arrivée en vue ne fait que lâcher la transition : pas de saut de
  // largeur, pas de "0" qui clignote.
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setArmed(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        io.disconnect();
        // Un frame de battement : le navigateur doit avoir peint l'état à 0
        // avant que la transition ait quelque chose à interpoler.
        requestAnimationFrame(() => setArmed(true));
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const text = String(value);

  return (
    <span ref={ref} className={className ? `rolling ${className}` : "rolling"}>
      <span className="sr-only">{text}</span>
      <span className="rolling-track" aria-hidden="true">
        {text.split("").map((char, index) => {
          const digit = DIGITS.indexOf(char);
          if (digit < 0) {
            return (
              <span className="rolling-static" key={`${index}-${char}`}>
                {char}
              </span>
            );
          }
          return (
            // La clé est l'INDEX et pas le caractère : une colonne doit garder
            // son identité quand son chiffre change, sinon React la remplace
            // et la transition ne part de rien.
            <span className="rolling-slot" key={index}>
              <span
                className="rolling-column"
                style={{
                  transform: `translateY(${armed ? -digit * 10 : 0}%)`,
                  transition: armed ? `transform ${duration}ms cubic-bezier(.22,.61,.36,1)` : "none",
                  // Décalage par colonne : les unités arrivent avant les
                  // dizaines, comme un vrai compteur mécanique.
                  transitionDelay: armed ? `${index * 60}ms` : "0ms",
                }}
              >
                {DIGITS.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </span>
            </span>
          );
        })}
      </span>
    </span>
  );
}

export default RollingNumber;
