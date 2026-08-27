"use client";

import { useEffect, useId, useRef } from "react";

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
/** Durée de l'apparition / disparition de la goutte, en secondes. */
const SCALE_TAU = 0.12;

type Props = {
  color?: string;
  /** Diamètre de la goutte en pixels. */
  size?: number;
};

/**
 * Goutte liquide qui suit le curseur à l'intérieur de son parent.
 *
 * Reprend la technique du LiquidCarveButton : un cercle passé dans un filtre
 * « goo » (feGaussianBlur + seuil alpha via feColorMatrix), ce qui lui donne des
 * épaulements de tension de surface quand il touche un bord, mais en version
 * ADDITIVE : ici la goutte se voit par-dessus la carte, alors que dans le bouton
 * elle creuse la pastille pour révéler la couleur derrière. Il fallait cette
 * variante parce que les cartes sponsors font varier leurs quatre rayons en
 * continu : le bouton dessine un <rect rx> à rayon unique, qui ne pourrait pas
 * suivre cette forme. Ici c'est le `overflow:hidden` + `border-radius:inherit`
 * du parent qui découpe la goutte, donc elle épouse la forme réelle, morph
 * compris.
 *
 * Le parent doit être `position:relative` et `overflow:hidden`.
 *
 * Les écouteurs sont posés sur l'élément parent (et pas sur ce calque, qui est
 * en `pointer-events:none` pour laisser passer les clics vers le lien du
 * sponsor). La boucle rAF ne tourne QUE pendant le survol : avec deux fois huit
 * cartes à l'écran, seize boucles permanentes seraient du gâchis.
 */
export function LiquidBlobHover({ color = "#44adab", size = 104 }: Props) {
  const layerRef = useRef<HTMLSpanElement>(null);
  const followRef = useRef<SVGGElement>(null);
  const squashRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    const host = layer?.parentElement;
    if (!layer || !host) return;
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

      // Le curseur est parti ET la goutte a fini de se résorber : on rend la
      // main au navigateur au lieu de tourner sur une image invisible.
      if (st.want === 0 && st.scale < 0.01) {
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
      // Pose la goutte directement sous le curseur à l'entrée, sinon elle
      // traverse la carte depuis le centre à chaque survol.
      st.x = st.tx;
      st.y = st.ty;
      st.want = 1;
      start();
    };
    const onMove = (e: PointerEvent) => {
      aim(e);
      st.want = 1;
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

  return (
    <span className="liquid-blob-layer" ref={layerRef} aria-hidden="true">
      <svg width="100%" height="100%" style={{ display: "block", overflow: "visible" }}>
        <defs>
          <filter id={filterId}>
            <feGaussianBlur in="SourceGraphic" stdDeviation={GOO_STRENGTH} result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" />
          </filter>
        </defs>
        <g filter={`url(#${filterId})`}>
          <g ref={followRef} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
            <g ref={squashRef} style={{ transformBox: "fill-box", transformOrigin: "center", transform: "scale(0)" }}>
              <circle cx="50%" cy="50%" r={size / 2} fill={color} />
            </g>
          </g>
        </g>
      </svg>
    </span>
  );
}

export default LiquidBlobHover;
