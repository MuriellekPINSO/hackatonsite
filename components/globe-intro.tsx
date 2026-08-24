"use client";

import { useEffect, useRef, useState } from "react";
import createGlobe, { type Globe } from "cobe";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TamebiWordmark } from "@/components/ui/tamebi-wordmark";

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

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

  // Spin freely, then ease onto Bénin, then idle-drift — a one-shot GSAP
  // timeline (time-based), independent from the scroll-driven exit below.
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const state = { phi: 0, theta: 0.15 };
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
      phi: state.phi,
      theta: state.theta,
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

    const SPIN_S = reduced ? 0 : 2.2;
    const SETTLE_S = reduced ? 0 : 1.6;

    let hasSettled = false;

    // Once the intro has settled onto Bénin, a visitor can grab the globe and
    // spin it — the offsets below just add onto the animated phi/theta, so
    // the idle sway keeps drifting around wherever they left it.
    let dragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragPhiOffset = 0;
    let dragThetaOffset = 0;
    let dragStartPhiOffset = 0;
    let dragStartThetaOffset = 0;

    const render = () => {
      globe.update({
        phi: state.phi + dragPhiOffset,
        theta: clamp(state.theta + dragThetaOffset, -1.3, 1.3),
      });
    };
    gsap.ticker.add(render);

    let idleTween: gsap.core.Tween | null = null;
    const settle = () => {
      hasSettled = true;
      setSettled(true);
      idleTween = gsap.fromTo(
        state,
        { phi: TARGET.phi - 0.02 },
        { phi: TARGET.phi + 0.02, duration: 12.57, ease: "sine.inOut", yoyo: true, repeat: -1 }
      );
    };

    const tl = gsap.timeline();
    if (reduced) {
      gsap.set(state, { phi: TARGET.phi, theta: TARGET.theta });
      settle();
    } else {
      // Frame-rate independent equivalent of the original "phi += 0.045/frame" spin.
      const spinRadians = 0.045 * 60 * SPIN_S;
      const settleDelta = shortestDelta(state.phi + spinRadians, TARGET.phi);
      tl.to(state, { phi: `+=${spinRadians}`, duration: SPIN_S, ease: "none" }).to(state, {
        phi: `+=${settleDelta}`,
        theta: TARGET.theta,
        duration: SETTLE_S,
        ease: "power2.out",
        onComplete: settle,
      });
    }

    canvas.style.cursor = "grab";
    canvas.style.touchAction = "none";

    const onPointerDown = (event: PointerEvent) => {
      if (!hasSettled) return;
      dragging = true;
      canvas.setPointerCapture(event.pointerId);
      dragStartX = event.clientX;
      dragStartY = event.clientY;
      dragStartPhiOffset = dragPhiOffset;
      dragStartThetaOffset = dragThetaOffset;
      canvas.style.cursor = "grabbing";
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      dragPhiOffset = dragStartPhiOffset + (event.clientX - dragStartX) * 0.006;
      dragThetaOffset = dragStartThetaOffset - (event.clientY - dragStartY) * 0.006;
    };
    const endDrag = (event: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      canvas.releasePointerCapture(event.pointerId);
      canvas.style.cursor = "grab";
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);

    return () => {
      tl.kill();
      idleTween?.kill();
      gsap.ticker.remove(render);
      ro.disconnect();
      globe.destroy();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endDrag);
      canvas.removeEventListener("pointercancel", endDrag);
    };
  }, []);

  // Scroll-linked exit: the globe scales up and fades as the visitor scrolls
  // past this section, revealing the real site (the untouched Hero) beneath.
  useEffect(() => {
    const section = wrapRef.current?.closest<HTMLElement>(".globe-intro-scroll");
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
        if (overlay) gsap.set(overlay, { opacity: 1 - Math.min(progress * 4, 1) });
      },
    });

    return () => st.kill();
  }, []);

  return (
    <section className="globe-intro-scroll">
      <div className="globe-intro-stage" ref={stageRef}>
        <div className="stamp-stars" aria-hidden="true" />
        <div className="globe-intro-overlay" ref={overlayRef}>
          <TamebiWordmark className="globe-intro-wordmark" light />
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
