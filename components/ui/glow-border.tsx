"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Bordure « comète » : un dégradé conique tourne derrière le cadre, un masque
 * n'en garde que l'épaisseur du bord, et ce qui reste est une tête de lumière
 * qui court le long du périmètre.
 *
 * Adapté du composant Glow Border d'Originkit, en trois points :
 *
 *  1. le calque tournant est dimensionné sur la DIAGONALE du cadre (+ marge)
 *     et pas sur un carré fixe géant : c'est le plus petit carré qui couvre
 *     encore le cadre à n'importe quel angle, donc pas de coins rabotés ni de
 *     surface inutile à composer ;
 *  2. l'accélération au survol s'accroche au parent direct (pointerenter /
 *     pointerleave) au lieu d'un `pointermove` global par instance, qui
 *     ferait un test de collision par mouvement de souris et par carte ;
 *  3. la boucle s'arrête quand le cadre sort du viewport ou que l'onglet passe
 *     en arrière-plan : sur une page qui en pose plusieurs, une comète
 *     invisible n'a aucune raison de continuer à tourner.
 *
 * Le composant est purement décoratif : `pointer-events:none`, `aria-hidden`,
 * et il s'efface complètement si le visiteur a demandé moins d'animations.
 */
type GlowBorderProps = {
  /** Couleur de la tête de comète. */
  glowColor?: string;
  /** Couleur de la traîne, juste derrière la tête. */
  tailColor?: string;
  /** Couleur du bord au repos, sur la portion non éclairée. */
  baseColor?: string;
  /** Degrés par seconde, avant multiplicateur de survol. */
  speed?: number;
  /** Facteur appliqué à `speed` quand le parent est survolé. */
  hoverMultiplier?: number;
  /** Épaisseur du filet, en px. */
  borderWidth?: number;
  /** Rayon des coins, en px : à aligner sur celui de l'élément encadré. */
  radius?: number;
  /** Longueur de la traîne, en % de l'arc disponible pour une comète. */
  tailLength?: number;
  /** Deux comètes opposées plutôt qu'une seule. */
  dualTails?: boolean;
  className?: string;
};

export function GlowBorder({
  glowColor = "#8fd4d2",
  tailColor = "rgba(68,173,171,.45)",
  baseColor = "rgba(255,255,255,.06)",
  speed = 34,
  hoverMultiplier = 3.2,
  borderWidth = 1.5,
  radius = 20,
  tailLength = 58,
  dualTails = true,
  className,
}: GlowBorderProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);

  // Props relues à chaque frame sans redémarrer la boucle : changer la vitesse
  // ne doit pas ramener la comète à 0°.
  const live = useRef({ speed, hoverMultiplier });
  live.current = { speed, hoverMultiplier };

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    const layer = layerRef.current;
    if (!host || !layer || reduced) return;

    const cleanups: Array<() => void> = [];

    // Un carré centré de côté s ne couvre que son cercle inscrit (rayon s/2) ;
    // les coins du cadre, eux, sont sur son cercle circonscrit (diagonale/2).
    // D'où la diagonale comme côté, plus une marge pour que le bord du carré
    // ne vienne pas raser les coins aux angles où il passe au plus près.
    const sizeLayer = () => {
      const size = Math.ceil(Math.hypot(host.clientWidth, host.clientHeight)) + 24;
      layer.style.width = `${size}px`;
      layer.style.height = `${size}px`;
      layer.style.top = `calc(50% - ${size / 2}px)`;
      layer.style.left = `calc(50% - ${size / 2}px)`;
    };
    sizeLayer();
    const observer = new ResizeObserver(sizeLayer);
    observer.observe(host);
    cleanups.push(() => observer.disconnect());

    let boost = 1;
    let boostTarget = 1;
    const parent = host.parentElement;
    if (parent) {
      const onEnter = () => {
        boostTarget = live.current.hoverMultiplier;
      };
      const onLeave = () => {
        boostTarget = 1;
      };
      parent.addEventListener("pointerenter", onEnter);
      parent.addEventListener("pointerleave", onLeave);
      cleanups.push(() => {
        parent.removeEventListener("pointerenter", onEnter);
        parent.removeEventListener("pointerleave", onLeave);
      });
    }

    let rotation = 0;
    let raf = 0;
    let last = 0;
    let visible = true;

    const frame = (now: number) => {
      // dt plafonné : un onglet remis au premier plan ne doit pas rattraper
      // d'un coup les degrés « manqués ».
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      boost += (boostTarget - boost) * (1 - Math.exp(-dt / 0.14));
      rotation = (rotation + live.current.speed * boost * dt) % 360;
      layer.style.transform = `rotate(${rotation}deg)`;
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (raf || !visible || document.hidden) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      if (!raf) return;
      cancelAnimationFrame(raf);
      raf = 0;
    };

    // Hors écran ou onglet en arrière-plan : rien à animer.
    const io = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;
      if (visible) start();
      else stop();
    });
    io.observe(host);
    cleanups.push(() => io.disconnect());

    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);
    cleanups.push(() => document.removeEventListener("visibilitychange", onVisibility));

    start();
    cleanups.push(stop);

    return () => cleanups.forEach((fn) => fn());
  }, [reduced]);

  if (reduced) return null;

  // La traîne est exprimée en % de l'arc dont dispose UNE comète : le tour
  // complet pour une seule, la moitié pour deux. Bridée sous l'arc entier pour
  // qu'il reste toujours un peu de bord au repos à parcourir.
  const span = dualTails ? 180 : 360;
  const length = Math.max(1, (Math.max(0, Math.min(100, tailLength)) / 100) * span * 0.94);
  // Tête et arc de décroissance volontairement larges : une borne de dégradé
  // conique est un rayon depuis le centre, donc une transition trop serrée se
  // lit comme une coupe droite en diagonale là où elle croise un coin.
  const tip = Math.max(6, length * 0.35);
  const decay = Math.max(8, length * 0.3);

  const comet = (end: number) =>
    [
      `${glowColor} ${end}deg`,
      `${tailColor} ${end + decay}deg`,
      `${baseColor} ${end + decay * 2}deg`,
      `${baseColor} ${end + span - length}deg`,
      `${tailColor} ${end + span - tip}deg`,
    ].join(", ");

  const stops = dualTails
    ? `${comet(0)}, ${comet(180)}, ${glowColor} 360deg`
    : `${comet(0)}, ${glowColor} 360deg`;

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className={className ? `glow-border ${className}` : "glow-border"}
      style={{
        borderRadius: `${radius}px`,
        padding: `${Math.max(0, borderWidth)}px`,
      }}
    >
      <div
        ref={layerRef}
        className="glow-border-layer"
        style={{
          background: `conic-gradient(from 0deg at 50% 50%, ${stops})`,
        }}
      />
    </div>
  );
}

export default GlowBorder;
