"use client";

import { useEffect, useId, useRef, useState } from "react";

// Mêmes constantes de réglage que LiquidCarveButton (le CTA du hero) : les deux
// effets doivent avoir exactement la même « viscosité », sinon la carte sponsor
// et le bouton d'inscription ne se ressemblent plus.
const GOO_STRENGTH = 8;
/** Temps pour combler 63 % de l'écart avec le curseur : c'est ce retard qui se
 *  lit comme de la dérive plutôt que comme un suivi collé au pointeur. */
const FOLLOW_TAU = 0.16;
/** La goutte s'étire selon SA propre vitesse, pas celle du curseur : elle
 *  s'allonge en rattrapant le pointeur et se rarrondit en arrivant. */
const SQUASH_TAU = 0.09;
const SQUASH_PER_PX_PER_SEC = 0.0011;
const SQUASH_MAX = 1.6;
/** Durée de l'apparition / disparition de la morsure, en secondes. */
const SCALE_TAU = 0.12;
/** Débord du calque au-delà de la carte, en pixels. Le seuil alpha du filtre
 *  goo redurcit le bord des rectangles pleine page à un demi-pixel près ; en
 *  poussant ce bord hors de la zone visible, on garantit qu'aucun liseré ne
 *  puisse apparaître le long de la carte. C'est l'`overflow:hidden` de la carte
 *  qui redécoupe ensuite le calque à sa vraie forme. */
const BLEED = 10;
/** Diamètre de la morsure, en proportion de la hauteur de la carte. Au-dessus
 *  de 1 elle déborde en permanence du haut et du bas, donc elle touche toujours
 *  un bord et forme des épaulements : c'est ce qui la fait lire comme une bande
 *  entamée plutôt que comme un rond posé. C'est exactement le régime du CTA du
 *  hero, dont la goutte est plus grosse que la hauteur du bouton. */
const SIZE_RATIO = 1.06;
const SIZE_FALLBACK = 104;

type Props = {
  /** Couleur révélée par la morsure (le calque du dessous). */
  color?: string;
  /** Couleur de la surface entamée. Doit matcher le fond de la carte. */
  surface?: string;
  /** Diamètre de la morsure en pixels. Par défaut : mesuré sur la hauteur du
   *  parent, ce qui suit tout seul le changement de `--sponsor-h` en mobile. */
  size?: number;
};

/**
 * Morsure liquide qui suit le curseur à l'intérieur de son parent.
 *
 * Reprend la technique EXACTE du LiquidCarveButton, y compris son caractère
 * SOUSTRACTIF : un masque SVG perce un trou circulaire dans la surface de la
 * carte, et un calque de couleur posé dessous se révèle par ce trou. Le filtre
 * « goo » (feGaussianBlur + seuil alpha via feColorMatrix) arrondit la morsure
 * en forme concave et lui donne des épaulements de tension de surface quand
 * elle atteint un bord.
 *
 * C'est toute la différence avec une goutte additive, qui ne serait qu'un rond
 * plat posé sur la carte : ici la morsure entame réellement la matière, donc
 * elle réagit aux bords comme sur le CTA.
 *
 * Le bouton dessine un <rect rx> à rayon unique pour sa pastille. Impossible
 * ici : les cartes sponsors font varier leurs quatre rayons en continu
 * (`sponsorMorph`). D'où les rectangles pleine page débordants, découpés par
 * l'`overflow:hidden` + le `border-radius` animé du parent — la morsure épouse
 * donc la forme réelle de la carte, morph compris.
 *
 * Le parent doit être `position:relative` et `overflow:hidden`.
 *
 * Les écouteurs sont posés sur l'élément parent (et pas sur ce calque, qui est
 * en `pointer-events:none` pour laisser passer les clics vers le lien du
 * sponsor). La boucle rAF ne tourne QUE pendant le survol : avec deux fois huit
 * cartes à l'écran, seize boucles permanentes seraient du gâchis. Au repos le
 * calque est carrément masqué, pour que le navigateur n'ait pas seize filtres
 * goo pleine page à garder en cache.
 */
export function LiquidBlobHover({ color = "#44adab", surface = "var(--cream-2)", size }: Props) {
  const layerRef = useRef<HTMLSpanElement>(null);
  const followRef = useRef<SVGGElement>(null);
  const squashRef = useRef<SVGGElement>(null);
  const [measured, setMeasured] = useState<number | null>(null);

  // Effet séparé de la boucle d'animation : la mesure doit avoir lieu même en
  // « reduced motion », où la boucle, elle, ne démarre pas.
  useEffect(() => {
    if (size !== undefined) return;
    const layer = layerRef.current;
    const host = (layer?.offsetParent as HTMLElement | null) ?? layer?.parentElement;
    if (!host) return;
    const read = () => setMeasured(Math.round(host.offsetHeight * SIZE_RATIO));
    read();
    // Ne se déclenche qu'au changement de palier responsive : les cartes ont une
    // hauteur fixe le reste du temps.
    const ro = new ResizeObserver(read);
    ro.observe(host);
    return () => ro.disconnect();
  }, [size]);

  const diameter = size ?? measured ?? SIZE_FALLBACK;

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    // Le calque est en position:absolute : son offsetParent est la carte, donc
    // la boîte à laquelle `inset` se réfère. C'est le bon repère pour la
    // géométrie ET pour les écouteurs, même si un <a> vient un jour s'intercaler
    // entre les deux (il serait `static`, donc pas offsetParent).
    const host = (layer.offsetParent as HTMLElement | null) ?? layer.parentElement;
    if (!host) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const st = { x: 0, y: 0, tx: 0, ty: 0, squash: 1, angle: 0, scale: 0, want: 0 };
    let raf = 0;
    let last = 0;

    const frame = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;

      const dx = (st.tx - st.x) * (1 - Math.exp(-dt / FOLLOW_TAU));
      const dy = (st.ty - st.y) * (1 - Math.exp(-dt / FOLLOW_TAU));
      st.x += dx;
      st.y += dy;

      const speed = Math.hypot(dx, dy) / dt;
      const wantSquash = Math.min(SQUASH_MAX, 1 + speed * SQUASH_PER_PX_PER_SEC);
      st.squash += (wantSquash - st.squash) * (1 - Math.exp(-dt / SQUASH_TAU));
      if (speed > 8) st.angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      st.scale += (st.want - st.scale) * (1 - Math.exp(-dt / SCALE_TAU));

      if (followRef.current) followRef.current.style.transform = `translate(${st.x}px, ${st.y}px)`;
      if (squashRef.current)
        squashRef.current.style.transform = `rotate(${st.angle}deg) scale(${st.squash * st.scale}, ${(1 / st.squash) * st.scale})`;

      // Le curseur est parti ET la morsure s'est refermée : on rend la main au
      // navigateur au lieu de tourner sur une image invisible.
      if (st.want === 0 && st.scale < 0.01) {
        layer.style.visibility = "hidden";
        raf = 0;
        last = 0;
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const aim = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      st.tx = e.clientX - (r.left + r.width / 2);
      st.ty = e.clientY - (r.top + r.height / 2);
    };

    const onEnter = (e: PointerEvent) => {
      aim(e);
      // Pose la morsure directement sous le curseur à l'entrée, sinon elle
      // traverse la carte depuis le centre à chaque survol.
      st.x = st.tx;
      st.y = st.ty;
      st.want = 1;
      layer.style.visibility = "visible";
      start();
    };
    const onMove = (e: PointerEvent) => {
      aim(e);
      st.want = 1;
      layer.style.visibility = "visible";
      start();
    };
    const onLeave = () => {
      st.want = 0;
      start();
    };

    host.addEventListener("pointerenter", onEnter);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
    return () => {
      host.removeEventListener("pointerenter", onEnter);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const uid = useId().replace(/:/g, "");
  const filterId = `blob-goo-${uid}`;
  const maskId = `blob-bite-${uid}`;

  return (
    <span
      className="liquid-blob-layer"
      ref={layerRef}
      aria-hidden="true"
      style={{ inset: -BLEED, visibility: "hidden" }}
    >
      <svg width="100%" height="100%" style={{ display: "block", overflow: "visible" }}>
        <defs>
          <filter id={filterId}>
            <feGaussianBlur in="SourceGraphic" stdDeviation={GOO_STRENGTH} result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" />
          </filter>
          {/* Blanc = on garde la surface, noir = on la perce. */}
          <mask id={maskId}>
            <rect x="0" y="0" width="100%" height="100%" fill="#fff" />
            <g ref={followRef} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
              <g
                ref={squashRef}
                style={{ transformBox: "fill-box", transformOrigin: "center", transform: "scale(0)" }}
              >
                <circle cx="50%" cy="50%" r={diameter / 2} fill="#000" />
              </g>
            </g>
          </mask>
        </defs>

        {/* Calque révélé : c'est lui qu'on voit à travers la morsure. */}
        <rect x="0" y="0" width="100%" height="100%" style={{ fill: color }} />

        {/* Surface de la carte, entamée par le masque puis passée au goo.
            `fill` est écrit en style et non en attribut de présentation : c'est
            la propriété CSS qui accepte var(), donc le thème sombre suit tout
            seul quand --cream-2 bascule. */}
        <g filter={`url(#${filterId})`}>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            style={{ fill: surface }}
            mask={`url(#${maskId})`}
          />
        </g>
      </svg>
    </span>
  );
}

export default LiquidBlobHover;
