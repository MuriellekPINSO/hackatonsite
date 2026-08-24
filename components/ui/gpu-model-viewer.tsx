"use client";

import "@google/model-viewer";
import { useEffect, useRef, useState } from "react";

export function GpuModelViewer({ className }: { className?: string }) {
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onLoad = () => setLoaded(true);
    el.addEventListener("load", onLoad);
    return () => el.removeEventListener("load", onLoad);
  }, []);

  return (
    <div className={className}>
      {!loaded && (
        <div className="gpu-model-skeleton" aria-hidden="true">
          Chargement du modèle 3D…
        </div>
      )}
      <model-viewer
        ref={ref}
        src="/gpu-model.glb"
        alt="Modèle 3D d'une carte graphique GPU"
        camera-controls
        auto-rotate
        rotation-per-second="18deg"
        camera-orbit="0deg 75deg 205%"
        min-camera-orbit="auto auto 130%"
        field-of-view="30deg"
        shadow-intensity="1"
        exposure="1.1"
        loading="lazy"
        interaction-prompt="none"
        style={{
          width: "100%",
          height: "100%",
          opacity: loaded ? 1 : 0,
          transition: "opacity .6s ease",
        }}
      />
    </div>
  );
}
