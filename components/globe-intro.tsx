"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { GlitterWrap } from "@/components/ui/glitter-wrap";
import Globe from "@/components/ui/globe";
import {
  AFRICA_PATH,
  AFRICA_VIEWBOX,
  BENIN_BBOX,
  BENIN_CENTROID,
  BENIN_PATH,
} from "@/lib/africa-geo";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// Cotonou, Bénin : le point que le globe met en avant pendant qu'il tourne.
const BENIN = { lat: 6.3703, lng: 2.3912 };

// Références stables : évite de recréer la scène WebGL à chaque re-render
// de GlobeIntro (le composant Globe recrée toute la scène quand l'identité
// de ces objets change).
const DOTS_CONFIG = { color: "#f1f1f3", size: 4, density: 7, allDots: false };
const MARKER_CONFIG = { markers: [BENIN], color: "#ffb59b", size: 34 };

const FULL_VIEWBOX = `0 0 ${AFRICA_VIEWBOX.width} ${AFRICA_VIEWBOX.height}`;

/**
 * viewBox final du zoom : le Bénin cadré à ~62 % de la hauteur, centré sur son
 * centroïde, en conservant le ratio de la viewBox d'origine (sinon la carte se
 * déforme en fin de course).
 */
const ZOOM_VIEWBOX = (() => {
  const ratio = AFRICA_VIEWBOX.width / AFRICA_VIEWBOX.height;
  const height = BENIN_BBOX.height / 0.62;
  const width = height * ratio;
  return `${(BENIN_CENTROID.x - width / 2).toFixed(1)} ${(BENIN_CENTROID.y - height / 2).toFixed(1)} ${width.toFixed(1)} ${height.toFixed(1)}`;
})();

export default function GlobeIntro() {
  const stageRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const africaRef = useRef<SVGPathElement>(null);
  const beninRef = useRef<SVGPathElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const [settled, setSettled] = useState(false);
  const [spinSpeed, setSpinSpeed] = useState(2.4);

  // Révèle le drapeau/légende/scroll-hint un instant après l'arrivée du
  // globe : reprend le timing de l'ancienne animation "spin puis settle",
  // maintenant que le globe tourne en continu au lieu de se figer.
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setSpinSpeed(0);
      setSettled(true);
      return;
    }
    const t = setTimeout(() => setSettled(true), 1400);
    return () => clearTimeout(t);
  }, []);

  // Séquence liée au scroll : globe → carte d'Afrique → Bénin surligné → zoom
  // sur la forme du pays → fondu vers le Hero.
  //
  // Tout passe par UNE timeline de durée 1 pilotée en `scrub`. Les positions
  // des tweens se lisent donc directement comme la progression du scroll (0,42
  // = 42 % de la section), ce qui est bien plus lisible qu'un onUpdate rempli de
  // remaps à la main, et c'est GSAP qui gère l'interpolation quand on scrolle
  // vers le haut.
  useEffect(() => {
    const section = stageRef.current?.closest<HTMLElement>(".globe-intro-scroll");
    const stage = stageRef.current;
    const overlay = overlayRef.current;
    const map = mapRef.current;
    const svg = svgRef.current;
    const africa = africaRef.current;
    const benin = beninRef.current;
    const caption = captionRef.current;
    if (!section || !stage || !overlay || !map || !svg || !africa || !benin || !caption) return;

    // Le tracé du Bénin se dessine : on mesure sa longueur réelle pour piloter
    // strokeDashoffset. getTotalLength() est en unités utilisateur de la
    // viewBox, comme le dasharray, donc les deux restent cohérents au zoom.
    const outlineLength = benin.getTotalLength();

    gsap.set(map, { opacity: 0, scale: 0.92 });
    gsap.set(benin, {
      fillOpacity: 0,
      strokeDasharray: outlineLength,
      strokeDashoffset: outlineLength,
    });
    gsap.set(caption, { opacity: 0 });
    gsap.set(svg, { attr: { viewBox: FULL_VIEWBOX } });

    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        pin: stage,
      },
    });

    // 1. Le globe s'efface en grandissant.
    // Le grossissement porte sur l'overlay du globe, PAS sur .globe-intro-stage :
    // la carte est elle aussi dans le stage, et la mettre à l'échelle ici la
    // recadrait au passage : la légende du bas se retrouvait poussée hors écran.
    tl.to(overlay, { opacity: 0, scale: 1.35, duration: 0.12 }, 0.2)
      // 2. Le continent arrive.
      .to(map, { opacity: 1, scale: 1, duration: 0.16 }, 0.26)
      // 3. Le Bénin se dessine puis se remplit.
      .to(benin, { strokeDashoffset: 0, duration: 0.12 }, 0.4)
      .to(benin, { fillOpacity: 1, duration: 0.08 }, 0.48)
      // 4. Zoom sur le pays, puis la légende prend le relais.
      .to(svg, { attr: { viewBox: ZOOM_VIEWBOX }, duration: 0.24, ease: "power1.inOut" }, 0.62)
      // Les frontières voisines s'estompent pendant le zoom. Deux raisons : ça
      // isole la forme du Bénin, qui est le sujet du plan ; et ça masque le seul
      // artefact de la simplification : le continent est simplifié à 0,4 px et
      // le Bénin à 0,05 px, donc à ×9,5 la frontière partagée se dédouble en un
      // liseré décalé. Les aligner voudrait dire embarquer un tracé Afrique de
      // 148 ko au lieu de 37 ko.
      .to(africa, { attr: { "stroke-opacity": 0.1 }, duration: 0.16 }, 0.62)
      .to(caption, { opacity: 1, duration: 0.07 }, 0.72)
      // 5. Sortie vers le Hero.
      .to(map, { opacity: 0, scale: 1.18, duration: 0.12 }, 0.88)
      .to(caption, { opacity: 0, duration: 0.1 }, 0.9);

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
      // Les tweens ont écrit des transforms inline : ScrollTrigger.kill() ne les
      // nettoie pas, et l'overlay resterait figé à scale(1.35) après un
      // hot-reload ou un démontage.
      gsap.set([stage, overlay, map], { clearProps: "transform,opacity" });
    };
  }, []);

  return (
    <section className="globe-intro-scroll">
      <div className="globe-intro-stage" ref={stageRef}>
        <GlitterWrap className="globe-intro-glitter" />
        <div className="globe-intro-overlay" ref={overlayRef}>
          <div className="globe-wrap">
            <Globe
              speed={spinSpeed}
              smoothing={7}
              scale={8}
              direction="left"
              initialLatitude={BENIN.lat}
              initialLongitude={BENIN.lng}
              dragSpeed={5}
              stopOnHover
              oceanColor="#0a0a0c"
              outlineColor="rgba(255,255,255,0.28)"
              outlineWidth={1}
              showOutline
              showGrid={false}
              dots={DOTS_CONFIG}
              markerConfig={MARKER_CONFIG}
            />
          </div>
          <p className={`globe-intro-caption${settled ? " in" : ""}`}>
            Le hackathon IA le plus ambitieux d'Afrique de l'Ouest atterrit ici.
          </p>
          <div className={`scroll-hint${settled ? " in" : ""}`}>
            <span>Défilez pour entrer</span>
            <span className="dot" />
          </div>
        </div>

        {/* Carte Afrique → Bénin. Hors de .globe-intro-overlay : cette couche a
            sa propre courbe d'opacité, elle ne doit pas hériter du fondu du
            globe. */}
        <div className="africa-layer" ref={mapRef} aria-hidden="true">
          {/* .africa-map reprend EXACTEMENT la boîte du <svg> (même ratio que la
              viewBox). C'est indispensable : la pastille est placée en
              pourcentages tirés du centroïde dans la viewBox, donc son référent
              doit être le cadre de la carte. Positionnée sur .africa-layer, qui
              fait toute la hauteur de la scène, elle tombait à côté du pays. */}
          <div className="africa-map">
            <svg
              className="africa-svg"
              ref={svgRef}
              viewBox={FULL_VIEWBOX}
              preserveAspectRatio="xMidYMid meet"
            >
            {/* non-scaling-stroke : l'épaisseur des frontières est figée en
                pixels écran, sinon le zoom (≈ ×9) les transformerait en gros
                traits baveux. */}
              <path
                className="africa-country"
                ref={africaRef}
                d={AFRICA_PATH}
                strokeOpacity={0.4}
                vectorEffect="non-scaling-stroke"
              />
              <path className="benin-shape" ref={beninRef} d={BENIN_PATH} vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
          <p className="benin-caption" ref={captionRef}>
            <strong>République du Bénin</strong>
            <span>Cotonou · 19–20 septembre 2026</span>
          </p>
        </div>
      </div>
    </section>
  );
}
