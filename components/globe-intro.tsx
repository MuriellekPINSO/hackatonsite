"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

// Ambiance sonore de l'intro. Volume plafonné bas : c'est un fond derrière le
// globe, pas un morceau, et la page démarre sans prévenir.
const AUDIO_SRC = "/alexzavesa-dance-playful-night-510786.mp3";
const AUDIO_VOLUME = 0.45;
// Fenêtre de scroll sur laquelle le son s'éteint. Elle se ferme juste avant que
// la carte ne parte vers le Hero (0,88) : l'Afrique arrive dans le silence.
const AUDIO_FADE_START = 0.72;
const AUDIO_FADE_END = 0.88;

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

  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Enveloppe de volume : `fade` = fondu d'entrée au démarrage, `scroll` = fondu
  // de sortie piloté par la timeline. Dans une ref et pas dans un state : la
  // valeur est réécrite à chaque frame de scroll.
  const gainRef = useRef({ fade: 0, scroll: 1 });
  const startedRef = useRef(false);
  const mutedRef = useRef(false);
  const audibleRef = useRef(true);
  const [muted, setMuted] = useState(false);
  const [audible, setAudible] = useState(true);

  const applyGain = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const { fade, scroll } = gainRef.current;
    audio.volume = Math.min(1, Math.max(0, fade * scroll)) * AUDIO_VOLUME;
    // En fin de séquence on arrête vraiment la lecture au lieu de la laisser
    // tourner à volume 0 : sinon la boucle continue sur tout le reste du site.
    // Et on relance si l'utilisateur remonte dans la section.
    if (scroll <= 0.001) {
      if (!audio.paused) audio.pause();
    } else if (audio.paused && startedRef.current && !mutedRef.current && !document.hidden) {
      void audio.play().catch(() => {});
    }
  }, []);

  const toggleSound = useCallback(() => {
    const audio = audioRef.current;
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    if (!audio) return;
    if (next) {
      audio.pause();
      return;
    }
    // Le clic est lui-même le geste utilisateur qui débloque la lecture.
    startedRef.current = true;
    void audio
      .play()
      .then(() => {
        if (gainRef.current.fade < 1) {
          gsap.to(gainRef.current, { fade: 1, duration: 1.2, ease: "power1.out", onUpdate: applyGain });
        }
        applyGain();
      })
      .catch(() => {});
  }, [applyGain]);

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

  // Le son démarre avec le globe. Les navigateurs refusent la lecture audible
  // tant que l'utilisateur n'a rien fait sur la page : on tente quand même, et
  // on réarme au premier geste (clic, touche, molette, tap) si c'est refusé.
  useEffect(() => {
    const audio = new Audio(AUDIO_SRC);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 0;
    audioRef.current = audio;

    let disposed = false;
    let fadeIn: gsap.core.Tween | null = null;
    const events = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    const detach = () => events.forEach((evt) => window.removeEventListener(evt, start));

    function start() {
      if (disposed || startedRef.current || mutedRef.current) return;
      void audio
        .play()
        .then(() => {
          if (disposed) return;
          startedRef.current = true;
          detach();
          fadeIn = gsap.to(gainRef.current, {
            fade: 1,
            duration: 2.2,
            ease: "power1.out",
            onUpdate: applyGain,
          });
        })
        .catch(() => {});
    }

    events.forEach((evt) => window.addEventListener(evt, start, { passive: true }));
    start();

    // Une boucle qui continue depuis un onglet caché est une nuisance.
    const onVisibility = () => {
      if (document.hidden) audio.pause();
      else applyGain();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      detach();
      document.removeEventListener("visibilitychange", onVisibility);
      fadeIn?.kill();
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, [applyGain]);

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
        // Le son suit le même axe que l'image : il s'éteint pendant que le
        // Bénin finit son zoom, et il revient si on remonte la section.
        onUpdate: (self) => {
          const k = 1 - (self.progress - AUDIO_FADE_START) / (AUDIO_FADE_END - AUDIO_FADE_START);
          gainRef.current.scroll = Math.min(1, Math.max(0, k));
          applyGain();
          const on = gainRef.current.scroll > 0.001;
          if (on !== audibleRef.current) {
            audibleRef.current = on;
            setAudible(on);
          }
        },
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
  }, [applyGain]);

  return (
    <section className="globe-intro-scroll">
      <div className="globe-intro-stage" ref={stageRef}>
        <GlitterWrap className="globe-intro-glitter" />

        {/* Commande son : posée sur la scène, pas dans .globe-intro-overlay,
            qui s'efface dès les premiers pourcents de scroll. */}
        <button
          type="button"
          className={`globe-sound${settled ? " in" : ""}${audible ? "" : " out"}`}
          onClick={toggleSound}
          // Sans ça, le pointerdown remonte jusqu'au listener qui débloque la
          // lecture : un clic pour couper le son le lancerait d'abord.
          onPointerDown={(e) => e.stopPropagation()}
          aria-pressed={!muted}
          aria-label={muted ? "Activer le son de l'intro" : "Couper le son de l'intro"}
        >
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5 6 9H3v6h3l5 4z" />
            {muted ? (
              <>
                <path d="M16 9.5 21 14.5" />
                <path d="M21 9.5 16 14.5" />
              </>
            ) : (
              <>
                <path d="M15.4 8.6a4.8 4.8 0 0 1 0 6.8" />
                <path d="M18.4 5.6a9 9 0 0 1 0 12.8" />
              </>
            )}
          </svg>
        </button>

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
