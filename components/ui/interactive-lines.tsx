"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

// Ported from a Framer "Reactive Lines" component (canvas hero background:
// mouse-reactive bundle of curved lines with a radial vignette fade).
// Already framework-agnostic (no Framer-specific APIs), kept as-is.

type Vec = { x: number; y: number };
const vec = (x: number, y: number): Vec => ({ x, y });
const vecAdd = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
const vecSub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
const vecMult = (a: Vec, s: number): Vec => ({ x: a.x * s, y: a.y * s });
const vecLerp = (a: Vec, b: Vec, t: number): Vec => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, mn: number, mx: number) => Math.max(mn, Math.min(mx, v));
const map = (v: number, a: number, b: number, c: number, d: number) => ((v - a) / (b - a)) * (d - c) + c;

function toRGB(str: string): { r: number; g: number; b: number } {
  if (str) {
    const m = str.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const p = m[1].split(",").map((s) => parseFloat(s));
      return { r: p[0] || 0, g: p[1] || 0, b: p[2] || 0 };
    }
    const hex = str.replace("#", "");
    if (hex.length >= 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      };
    }
  }
  return { r: 10, g: 10, b: 10 };
}

interface CanvasState {
  width: number;
  height: number;
  dpr: number;
  isVisible: boolean;
  isPageVisible: boolean;
  animationId: number;
}

function useCanvasAnimation({
  deferStart = false,
  onSetup,
  onDraw,
}: {
  deferStart?: boolean;
  onSetup?: (ctx: CanvasRenderingContext2D, state: CanvasState) => void;
  onDraw: (ctx: CanvasRenderingContext2D, state: CanvasState) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<CanvasState>({
    width: 0,
    height: 0,
    dpr: 1,
    isVisible: true,
    isPageVisible: true,
    animationId: 0,
  });

  const onDrawRef = useRef(onDraw);
  onDrawRef.current = onDraw;
  const onSetupRef = useRef(onSetup);
  onSetupRef.current = onSetup;

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const st = stateRef.current;

    const setup = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      st.width = rect.width;
      st.height = rect.height;
      st.dpr = dpr;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const loop = () => {
      onDrawRef.current(ctx, st);
      st.animationId = requestAnimationFrame(loop);
    };

    const start = () => {
      if (!st.animationId && st.isVisible && st.isPageVisible) {
        st.animationId = requestAnimationFrame(loop);
      }
    };

    const stop = () => {
      if (st.animationId) {
        cancelAnimationFrame(st.animationId);
        st.animationId = 0;
      }
    };

    setup();
    onSetupRef.current?.(ctx, st);

    if (!deferStart) start();

    let debTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(debTimer);
      debTimer = setTimeout(() => {
        stop();
        setup();
        start();
      }, 100);
    };

    const onPageVis = () => {
      st.isPageVisible = document.visibilityState === "visible";
      st.isPageVisible ? start() : stop();
    };

    const io = new IntersectionObserver(
      (entries) => {
        st.isVisible = entries[0]?.isIntersecting ?? true;
        st.isVisible && st.isPageVisible ? start() : stop();
      },
      { threshold: 0 }
    );

    io.observe(container);
    window.addEventListener("resize", onResize, { passive: true });
    document.addEventListener("visibilitychange", onPageVis);

    (canvas as unknown as { __canvasStart?: () => void }).__canvasStart = start;

    return () => {
      stop();
      clearTimeout(debTimer);
      io.disconnect();
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onPageVis);
    };
  }, [deferStart]);

  return { containerRef, canvasRef, stateRef };
}

interface InteractiveLinesProps {
  backgroundColor?: string;
  lineColor?: string;
  lineWidth?: number;
  minLines?: number;
  maxLines?: number;
  fade?: boolean;
  fadeIntensity?: number;
  style?: CSSProperties;
}

export default function InteractiveLines({
  style,
  backgroundColor = "#0C0D0D",
  lineColor = "#00FFF2",
  lineWidth = 5,
  minLines = 22,
  maxLines = 90,
  fade = true,
  fadeIntensity = 50,
}: InteractiveLinesProps) {
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const cfgRef = useRef({ linesNum: 40, bias: 0.5 });

  const { containerRef, canvasRef, stateRef } = useCanvasAnimation({
    // Starts immediately at a centered mouse position instead of waiting for
    // a first mousemove: this is a hero background, visible before anyone
    // necessarily touches the mouse (and never, on touch devices).
    deferStart: false,

    onSetup: (_e, t) => {
      mouseRef.current.targetX = t.width / 2;
      mouseRef.current.targetY = t.height / 2;
      mouseRef.current.x = t.width / 2;
      mouseRef.current.y = t.height / 2;
    },

    onDraw: (e, t) => {
      const { width: r, height: n } = t;
      const a = mouseRef.current;
      const o = cfgRef.current;

      a.x = a.x + (a.targetX - a.x) * 0.05;
      a.y = a.y + (a.targetY - a.y) * 0.1;

      e.fillStyle = backgroundColor;
      e.fillRect(0, 0, r, n);

      e.save();
      e.translate(r / 2, n / 2);

      const s = r < 500;
      const u = s ? 0.8 * n : 0;
      const d = s ? 1.5 : 0.7;

      const c = vec(r, -(1.1 * n) + u);
      const f = vec(0, 2 * n);
      const g = vec(-r, -n + u);

      const lo = Math.min(minLines, maxLines);
      const hi = Math.max(minLines, maxLines);
      const h = clamp(map(a.y, 0, n, lo, hi), lo, hi);
      o.linesNum = lerp(o.linesNum, h, 0.1);

      const b = clamp(map(a.x, 0, r, 0.6, 0.4), 0.4, 0.6);
      o.bias = lerp(o.bias, b, 0.05);

      e.strokeStyle = lineColor;
      e.lineWidth = lineWidth;

      for (let i = 0; i < o.linesNum; i++) {
        const ratio = i / (o.linesNum - 1);

        const lineEnd = vec(lerp(f.x, g.x, 1 - ratio * ratio), lerp(f.y, g.y, 1 - ratio * ratio));

        const l = vecAdd(vecMult(c, 0.5), vecMult(lineEnd, 0.5));

        const dispTarget = vecMult(vecAdd(f, l), 0.5);

        (function (ctx: CanvasRenderingContext2D, p0: Vec, p1: Vec, disp: Vec, bias: number, amt: number) {
          const mid = vecLerp(p0, p1, 0.5);
          const offset = vecSub(disp, mid);

          ctx.beginPath();
          for (let k = 0; k <= 50; k++) {
            const tt = k / 50;
            const base = vecLerp(p0, p1, tt);
            const w = 2 * Math.pow(tt, amt * (1 - bias) * 2) * Math.pow(1 - tt, amt * bias * 2);
            const pt = vecAdd(base, vecMult(offset, w));
            k === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y);
          }
          ctx.stroke();
        })(e, c, lineEnd, dispTarget, o.bias, d);
      }

      e.restore();

      if (fade) {
        const bg = toRGB(backgroundColor);
        const rgba = (alpha: number) => `rgba(${bg.r}, ${bg.g}, ${bg.b}, ${alpha})`;
        const inner = clamp(map(fadeIntensity, 1, 50, 0.82, 0.25), 0.25, 0.82);
        const maxA = clamp(map(fadeIntensity, 1, 50, 0.35, 0.9), 0.35, 0.9);
        e.save();
        const cx = r / 2;
        const cy = n / 2;
        const x = Math.max(r, n) / 2;
        e.translate(cx, cy);
        e.scale(r / (2 * x), n / (2 * x));
        const grad = e.createRadialGradient(0, 0, 0, 0, 0, x);
        grad.addColorStop(0, rgba(0));
        grad.addColorStop(inner, rgba(0));
        grad.addColorStop(lerp(inner, 1, 0.5), rgba(maxA * 0.3));
        grad.addColorStop(lerp(inner, 1, 0.8), rgba(maxA * 0.7));
        grad.addColorStop(1, rgba(maxA));
        e.fillStyle = grad;
        e.fillRect(-x, -x, 2 * x, 2 * x);
        e.restore();
      }
    },
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rect = container.getBoundingClientRect();

    let started = false;
    const onMove = (ev: MouseEvent) => {
      if (!stateRef.current.isVisible) return;
      mouseRef.current.targetX = ev.clientX - rect.left;
      mouseRef.current.targetY = ev.clientY - rect.top;
      if (!started) {
        started = true;
        (canvasRef.current as unknown as { __canvasStart?: () => void } | null)?.__canvasStart?.();
      }
    };

    let rafId = 0;
    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rect = container.getBoundingClientRect();
        rafId = 0;
      });
    };

    document.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      document.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [containerRef, stateRef, canvasRef]);

  return (
    <div
      ref={containerRef}
      style={{
        ...style,
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
      }}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}
