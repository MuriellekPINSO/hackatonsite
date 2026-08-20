"use client";

import { useEffect, useRef, useState } from "react";
import createGlobe, { type Globe } from "cobe";

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

// Cotonou, Bénin — le point que le globe doit finir par regarder de face.
const BENIN: [number, number] = [6.3703, 2.3912];

// Formules internes de cobe (vérifiées dans node_modules/cobe/dist/index.esm.js) :
// U() projette [lat,lng] sur la sphère unité, O() projette un point 3D à l'écran
// selon phi/theta. On résout phi/theta pour que le point de Bénin tombe au centre.
function locationToVector([lat, lng]: [number, number]): [number, number, number] {
  const r = (lat * Math.PI) / 180;
  const a = (lng * Math.PI) / 180 - Math.PI;
  const o = Math.cos(r);
  return [-o * Math.cos(a), Math.sin(r), o * Math.sin(a)];
}

function anglesToFace(location: [number, number]) {
  const [x, y, z] = locationToVector(location);
  const r = Math.sqrt(x * x + z * z);
  return { phi: Math.atan2(-x, z), theta: Math.atan2(y, r) };
}

const TARGET = anglesToFace(BENIN);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
// Shortest angular path so the settle never spins the "wrong" way round.
const shortestDelta = (from: number, to: number) => {
  const diff = (to - from) % (Math.PI * 2);
  return ((diff + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
};

export default function GlobeIntro() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [settled, setSettled] = useState(false);

  // Spin freely, then ease onto Bénin, then idle-drift — a one-shot intro
  // animation (time-based), independent from the scroll-driven exit below.
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let phi = 0;
    let theta = 0.15;
    let width = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const setSize = () => {
      width = wrap.offsetWidth;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${width}px`;
      globe?.update({ width: width * dpr, height: width * dpr });
    };

    const globe: Globe = createGlobe(canvas, {
      width: 600 * dpr,
      height: 600 * dpr,
      phi,
      theta,
      dark: 1,
      diffuse: 1.1,
      mapSamples: 12000,
      mapBrightness: 4.5,
      baseColor: [0.16, 0.16, 0.18],
      markerColor: [0.76, 0.31, 0.16],
      glowColor: [0.3, 0.28, 0.3],
      devicePixelRatio: dpr,
      markers: [{ location: BENIN, size: 0.05, color: [1, 0.71, 0.61] }],
    });

    setSize();
    const ro = new ResizeObserver(setSize);
    ro.observe(wrap);

    let raf = 0;
    const start = performance.now();
    const SPIN_MS = reduced ? 0 : 2200;
    const SETTLE_MS = reduced ? 0 : 1600;

    let settleStartPhi = phi;
    let settleStartTheta = theta;
    let settleDelta = 0;
    let hasSettled = false;

    const frame = (now: number) => {
      const t = now - start;

      if (t < SPIN_MS) {
        phi += 0.045;
      } else if (t < SPIN_MS + SETTLE_MS) {
        if (settleDelta === 0 && t >= SPIN_MS) {
          settleStartPhi = phi;
          settleStartTheta = theta;
          settleDelta = shortestDelta(phi, TARGET.phi);
        }
        const p = easeOutCubic(clamp((t - SPIN_MS) / SETTLE_MS, 0, 1));
        phi = settleStartPhi + settleDelta * p;
        theta = settleStartTheta + (TARGET.theta - settleStartTheta) * p;
      } else {
        phi = TARGET.phi + Math.sin(t / 4000) * 0.02;
        theta = TARGET.theta;
        if (!hasSettled) {
          hasSettled = true;
          setSettled(true);
        }
      }

      globe.update({ phi, theta });
      raf = requestAnimationFrame(frame);
    };

    if (reduced) {
      phi = TARGET.phi;
      theta = TARGET.theta;
      globe.update({ phi, theta });
      setSettled(true);
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      globe.destroy();
    };
  }, []);

  // Scroll-linked exit: the globe scales up and fades as the visitor scrolls
  // past this section, revealing the real site (the untouched Hero) beneath —
  // same getBoundingClientRect progress technique as the Hero's own scrub.
  useEffect(() => {
    const section = wrapRef.current?.closest<HTMLElement>(".globe-intro-scroll");
    const stage = stageRef.current;
    const overlay = overlayRef.current;
    if (!section || !stage) return;

    const onScroll = () => {
      const scrollable = section.offsetHeight - window.innerHeight;
      const rect = section.getBoundingClientRect();
      const scrolled = clamp(-rect.top, 0, Math.max(scrollable, 0));
      const progress = scrollable > 0 ? scrolled / scrollable : 0;

      stage.style.transform = `scale(${1 + progress * 1.5})`;
      stage.style.opacity = String(1 - progress);
      if (overlay) overlay.style.opacity = String(1 - Math.min(progress * 4, 1));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section className="globe-intro-scroll">
      <div className="globe-intro-stage" ref={stageRef}>
        <div className="stamp-stars" />
        <div className="globe-intro-overlay" ref={overlayRef}>
          <span className="kicker" style={{ color: "var(--gold)" }}>
            Tamebi Challenge
          </span>
          <div className="globe-wrap" ref={wrapRef}>
            <canvas ref={canvasRef} />
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
