"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { GlitterWrap } from "@/components/ui/glitter-wrap";
import Globe from "@/components/ui/globe";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// Cotonou, Bénin — le point que le globe met en avant pendant qu'il tourne.
const BENIN = { lat: 6.3703, lng: 2.3912 };

// Références stables : évite de recréer la scène WebGL à chaque re-render
// de GlobeIntro (le composant Globe recrée toute la scène quand l'identité
// de ces objets change).
const DOTS_CONFIG = { color: "#f1f1f3", size: 4, density: 7, allDots: false };
const MARKER_CONFIG = { markers: [BENIN], color: "#ffb59b", size: 34 };

export default function GlobeIntro() {
  const stageRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [settled, setSettled] = useState(false);
  const [spinSpeed, setSpinSpeed] = useState(2.4);

  // Révèle le drapeau/légende/scroll-hint un instant après l'arrivée du
  // globe — reprend le timing de l'ancienne animation "spin puis settle",
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

  // Scroll-linked exit: the globe scales up and fades as the visitor scrolls
  // past this section, revealing the real site (the untouched Hero) beneath.
  useEffect(() => {
    const section = stageRef.current?.closest<HTMLElement>(".globe-intro-scroll");
    const stage = stageRef.current;
    const overlay = overlayRef.current;
    if (!section || !stage) return;

    const st = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      pin: stage,
      onUpdate: (self) => {
        const progress = self.progress;
        gsap.set(stage, { scale: 1 + progress * 1.5, opacity: 1 - progress });
        // Was fading 4x faster than the stage/pin itself, so the overlay (globe +
        // text) vanished by 25% progress while the pin held the section on screen
        // for the other 75% — a long stretch of plain black before Hero appeared.
        // Keep it in lockstep with the stage so the two fade out together.
        if (overlay) gsap.set(overlay, { opacity: 1 - progress });
      },
    });

    return () => st.kill();
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
            <div className={`globe-flag${settled ? " in" : ""}`}>
              <span className="globe-flag-emoji">🇧🇯</span>
              <span>Bénin</span>
            </div>
          </div>
          <p className={`globe-intro-caption${settled ? " in" : ""}`}>
            Le hackathon IA le plus ambitieux d'Afrique de l'Ouest atterrit ici.
          </p>
          <div className={`scroll-hint${settled ? " in" : ""}`}>
            <span>Défilez pour entrer</span>
            <span className="dot" />
          </div>
        </div>
      </div>
    </section>
  );
}
