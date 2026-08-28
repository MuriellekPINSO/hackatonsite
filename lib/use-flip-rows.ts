"use client";

import { useLayoutEffect, useRef, type MutableRefObject } from "react";

/**
 * Fait GLISSER les lignes d'une liste vers leur nouvelle place au lieu de les
 * téléporter, avec la technique FLIP (First, Last, Invert, Play).
 *
 * Le principe : après chaque rendu on relève la position de chaque ligne. Si
 * une ligne n'est plus là où elle était au rendu précédent, on la replace
 * d'abord à son ancienne position par un `translateY` posé sans transition
 * (Invert), on force un reflow pour que le navigateur peigne cet état, puis on
 * enlève le décalage avec une transition (Play). Le navigateur interpole, et
 * la ligne a l'air d'avoir voyagé alors qu'elle a été déplacée d'un coup par
 * le DOM.
 *
 * Ce que ça donne dans le classement : quand une équipe double une autre entre
 * deux relevés, les deux lignes se croisent réellement sous les yeux du
 * visiteur. C'est ce qui différencie un tableau « en direct » d'un tableau qui
 * se contente d'être à jour.
 *
 * Au-delà de MAX_SHIFT, la ligne saute au lieu de glisser. Un dépassement en
 * direct fait bouger une ligne d'un ou deux crans, et le voir est tout
 * l'intérêt ; un changement de critère de tri, lui, réordonne les douze lignes
 * d'un coup, et douze lignes qui se traversent en même temps donnent une
 * bouillie illisible pendant une demi-seconde. Le seuil garde l'animation là
 * où elle raconte quelque chose.
 *
 * `offsetTop` plutôt que `getBoundingClientRect()` : le tableau vit dans son
 * propre conteneur défilant, et une position mesurée par rapport au viewport
 * changerait à chaque coup de molette, ce qui déclencherait des glissements
 * fantômes sur des lignes qui n'ont pas bougé.
 */
/** Déplacement maximal encore animé, en px (environ quatre hauteurs de ligne). */
const MAX_SHIFT = 340;
/** Doit rester aligné sur la transition `transform` posée en CSS. */
const SLIDE_MS = 700;

export function useFlipRows<T extends HTMLElement>(
  refs: MutableRefObject<Record<string, T | null>>,
  /** Change à chaque fois que l'ordre PEUT avoir changé (liste triée, filtrée…). */
  deps: unknown[]
) {
  const positions = useRef<Map<string, number> | null>(null);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useLayoutEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const next = new Map<string, number>();
    const previous = positions.current;

    for (const [id, el] of Object.entries(refs.current)) {
      if (!el) continue;
      const top = el.offsetTop;
      next.set(id, top);
      if (reduced || !previous) continue;

      const before = previous.get(id);
      if (before === undefined) continue;
      const shift = before - top;
      // Sous le pixel, c'est un arrondi de rendu, pas un déplacement.
      if (Math.abs(shift) < 1) continue;
      if (Math.abs(shift) > MAX_SHIFT) continue;

      // Pendant son voyage, la ligne passe au-dessus des autres et ses
      // cellules deviennent opaques : sans ça, deux lignes qui se croisent se
      // superposent en transparence et on lit les deux à la fois.
      el.classList.add("is-sliding");
      const running = timers.current.get(id);
      if (running) clearTimeout(running);
      timers.current.set(
        id,
        setTimeout(() => {
          el.classList.remove("is-sliding");
          timers.current.delete(id);
        }, SLIDE_MS)
      );

      el.style.transition = "none";
      el.style.transform = `translateY(${shift}px)`;
      // Lecture forcée : sans elle le navigateur regrouperait les deux
      // écritures de style et n'interpolerait rien du tout.
      void el.offsetHeight;
      // Les deux propriétés sont RENDUES au CSS plutôt que réécrites en
      // inline. La durée du glissement vit donc dans la feuille de style, avec
      // le reste des transitions de la ligne, et surtout on ne laisse pas une
      // règle inline permanente qui écraserait la transition de fond au survol.
      el.style.transition = "";
      el.style.transform = "";
    }

    // Le tout premier passage ne fait que relever les positions : arriver sur
    // la page n'est pas un mouvement, et faire glisser douze lignes à
    // l'ouverture serait du bruit.
    positions.current = next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useLayoutEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
    };
  }, []);
}
