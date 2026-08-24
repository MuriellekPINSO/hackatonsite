"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type ModelViewerLike = HTMLElement & { cameraOrbit: string; autoRotate: boolean };

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface Step {
  num: string;
  title: string;
  description: ReactNode;
}

interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function DefiDiagram({ steps, model }: { steps: Step[]; model: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);
  const annotationRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    const model = modelRef.current;
    if (!container || !model) return;

    const compute = () => {
      const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
      const containerRect = container.getBoundingClientRect();
      setSize({ width: containerRect.width, height: containerRect.height });

      if (!isDesktop) {
        setLines([]);
        return;
      }

      const modelRect = model.getBoundingClientRect();
      const modelCenter = {
        x: modelRect.left + modelRect.width / 2 - containerRect.left,
        y: modelRect.top + modelRect.height / 2 - containerRect.top,
      };
      const modelRadius = Math.min(modelRect.width, modelRect.height) / 2;

      const next: Line[] = [];
      annotationRefs.current.forEach((el) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const annotationCenter = {
          x: rect.left + rect.width / 2 - containerRect.left,
          y: rect.top + rect.height / 2 - containerRect.top,
        };
        const dx = annotationCenter.x - modelCenter.x;
        const dy = annotationCenter.y - modelCenter.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const modelEdge = {
          x: modelCenter.x + (dx / dist) * modelRadius,
          y: modelCenter.y + (dy / dist) * modelRadius,
        };
        // Anchor on the edge of the annotation block closest to the model.
        const annotationEdge = {
          x: annotationCenter.x - (dx / dist) * (rect.width / 2),
          y: annotationCenter.y - (dy / dist) * (rect.height / 2),
        };
        next.push({ x1: annotationEdge.x, y1: annotationEdge.y, x2: modelEdge.x, y2: modelEdge.y });
      });
      setLines(next);
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(container);
    window.addEventListener("resize", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, [steps.length]);

  // Desktop-only: pin the diagram while the GPU model orbits a full turn and
  // the three annotations highlight one-by-one in sync with scroll progress.
  useEffect(() => {
    const container = containerRef.current;
    const modelWrap = modelRef.current;
    if (!container || !modelWrap) return;

    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px)", () => {
      // GpuModelViewer loads its custom element lazily (dynamic import), so
      // the <model-viewer> tag may not exist yet at setup time — query it
      // fresh on every callback instead of caching a possibly-null reference.
      const getModel = () => modelWrap.querySelector("model-viewer") as ModelViewerLike | null;

      const clearHighlight = () => {
        annotationRefs.current.forEach((el) => el?.classList.remove("defi-active", "defi-dimmed"));
      };

      const st = ScrollTrigger.create({
        trigger: container,
        start: "top top",
        end: "+=120%",
        pin: true,
        scrub: true,
        onEnter: () => {
          const mv = getModel();
          if (mv) mv.autoRotate = false;
        },
        onEnterBack: () => {
          const mv = getModel();
          if (mv) mv.autoRotate = false;
        },
        onUpdate: (self) => {
          const progress = self.progress;
          const mv = getModel();
          if (mv) mv.cameraOrbit = `${progress * 360}deg 75deg 205%`;
          const activeIndex = Math.min(steps.length - 1, Math.floor(progress * steps.length));
          annotationRefs.current.forEach((el, i) => {
            if (!el) return;
            el.classList.toggle("defi-active", i === activeIndex);
            el.classList.toggle("defi-dimmed", i !== activeIndex);
          });
        },
        onLeave: () => {
          clearHighlight();
          const mv = getModel();
          if (mv) mv.autoRotate = true;
        },
        onLeaveBack: () => {
          clearHighlight();
          const mv = getModel();
          if (mv) mv.autoRotate = true;
        },
      });

      return () => {
        st.kill();
        clearHighlight();
        const mv = getModel();
        if (mv) mv.autoRotate = true;
      };
    });

    return () => mm.revert();
  }, [steps.length]);

  return (
    <div className="defi-diagram reveal" ref={containerRef}>
      {lines.length > 0 && (
        <svg className="defi-diagram-lines" width={size.width} height={size.height} aria-hidden="true">
          {lines.map((l, i) => (
            <g key={i}>
              <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
              <circle cx={l.x2} cy={l.y2} r="4" />
            </g>
          ))}
        </svg>
      )}
      <div className="defi-diagram-model" ref={modelRef}>
        {model}
      </div>
      {steps.map((step, i) => (
        <div
          key={step.num}
          className={`defi-annotation defi-annotation-${i + 1}`}
          ref={(el) => {
            annotationRefs.current[i] = el;
          }}
        >
          <span className="defi-annotation-num">{step.num}</span>
          <h3>{step.title}</h3>
          <p>{step.description}</p>
        </div>
      ))}
    </div>
  );
}
