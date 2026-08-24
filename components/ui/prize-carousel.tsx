"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TamebiWordmark } from "@/components/ui/tamebi-wordmark";

const useIsoLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

export interface PrizeItem {
  rank: string;
  title: string;
  description: string;
}

export function PrizeCarousel({
  items,
  cardWidth = "clamp(220px, 24vw, 300px)",
  aspectRatio = 1.3,
  rotate = 40,
  depth = 0.5,
  perspective = 3,
  falloff = 0.6,
  fade = 0.15,
  gap = 0.1,
  autoPlayInterval = 3200,
}: {
  items: PrizeItem[];
  cardWidth?: string;
  /** Card height as a multiple of its width. */
  aspectRatio?: number;
  rotate?: number;
  depth?: number;
  perspective?: number;
  falloff?: number;
  fade?: number;
  gap?: number;
  autoPlayInterval?: number;
}) {
  const count = items.length;

  const frameRef = React.useRef<HTMLDivElement>(null);
  const cardRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const posRef = React.useRef(0);
  const targetRef = React.useRef(0);
  const widthRef = React.useRef(0);
  const rafRef = React.useRef<number | null>(null);
  const dragRef = React.useRef<{ id: number; x: number; pos: number; v: number; t: number } | null>(null);

  const [selected, setSelected] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  const indexAt = React.useCallback(
    (pos: number) => ((Math.round(pos) % count) + count) % count,
    [count]
  );

  const paint = React.useCallback(() => {
    const width = widthRef.current;
    if (!width) return;
    const pitch = width * (1 + gap);
    const pos = posRef.current;

    cardRefs.current.forEach((card, index) => {
      if (!card) return;
      let offset = index - pos;
      offset = ((offset % count) + count) % count;
      if (offset > count / 2) offset -= count;

      const distance = Math.abs(offset);
      const ramp = Math.pow(distance, falloff);
      const tilt = Math.min(rotate * ramp, 82) * Math.sign(offset);

      card.style.transform =
        `translateX(calc(-50% + ${offset * pitch}px)) ` +
        `translateZ(${-depth * width * ramp}px) rotateY(${-tilt}deg)`;

      const edge = Math.min(1, Math.max(0, count / 2 - distance));
      card.style.opacity = String(Math.max(0, 1 - fade * distance) * edge);
      card.style.zIndex = String(100 - Math.round(distance));
    });
  }, [count, depth, fade, falloff, gap, rotate]);

  const settle = React.useCallback(
    (target: number) => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      targetRef.current = target;
      setSelected(indexAt(target));

      const step = () => {
        const remaining = target - posRef.current;
        if (Math.abs(remaining) < 0.0004) {
          posRef.current = target;
          paint();
          rafRef.current = null;
          return;
        }
        posRef.current += remaining * 0.16;
        paint();
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [indexAt, paint]
  );

  const goTo = React.useCallback(
    (index: number) => {
      const target = index + Math.round((targetRef.current - index) / count) * count;
      settle(target);
    },
    [count, settle]
  );

  const nudge = React.useCallback((by: number) => settle(Math.round(targetRef.current) + by), [settle]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    targetRef.current = posRef.current;
    dragRef.current = { id: event.pointerId, x: event.clientX, pos: posRef.current, v: 0, t: performance.now() };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const pitch = widthRef.current * (1 + gap);
    if (!pitch) return;

    const now = performance.now();
    const previous = posRef.current;
    posRef.current = drag.pos - (event.clientX - drag.x) / pitch;
    drag.v = ((posRef.current - previous) / Math.max(now - drag.t, 1)) * 1000;
    drag.t = now;

    const index = indexAt(posRef.current);
    if (index !== selected) setSelected(index);
    paint();
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    dragRef.current = null;
    const carried = Math.max(-2, Math.min(2, drag.v * 0.18));
    settle(Math.round(posRef.current + carried));
  };

  useIsoLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => {
      const card = cardRefs.current[0];
      if (!card) return;
      widthRef.current = card.offsetWidth;
      paint();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [paint]);

  React.useEffect(() => {
    if (paused) return;
    const id = setInterval(() => nudge(1), autoPlayInterval);
    return () => clearInterval(id);
  }, [paused, nudge, autoPlayInterval]);

  React.useEffect(() => () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div
      className="prize-carousel reveal"
      style={{ ["--pc-card" as string]: cardWidth, ["--pc-height" as string]: `calc(var(--pc-card) * ${aspectRatio})` }}
      role="region"
      aria-roledescription="carousel"
      aria-label="Palmarès"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        ref={frameRef}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            nudge(-1);
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            nudge(1);
          }
        }}
        className="prize-carousel-frame"
        style={{ perspective: `calc(var(--pc-card) * ${perspective})` }}
      >
        <div className="prize-carousel-track">
          {items.map((item, index) => (
            <div
              key={item.rank}
              ref={(node) => {
                cardRefs.current[index] = node;
              }}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${count}`}
              className={`prize-carousel-card${index === selected ? " is-active" : ""}`}
            >
              <TamebiWordmark className="prize-carousel-logo" />
              <div className="rank">{item.rank}</div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="prize-carousel-controls">
        <button type="button" aria-label="Précédent" onClick={() => nudge(-1)} className="prize-carousel-nav">
          <ChevronLeft size={18} />
        </button>
        <div className="prize-carousel-dots" role="tablist">
          {items.map((item, index) => (
            <button
              key={item.rank}
              type="button"
              role="tab"
              aria-selected={index === selected}
              aria-label={`Aller à ${item.title}`}
              onClick={() => goTo(index)}
              className={index === selected ? "is-active" : ""}
            />
          ))}
        </div>
        <button type="button" aria-label="Suivant" onClick={() => nudge(1)} className="prize-carousel-nav">
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
