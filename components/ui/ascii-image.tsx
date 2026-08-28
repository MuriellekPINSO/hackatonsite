"use client";

import { useEffect, useRef } from "react";

/**
 * Image rendue en ASCII, qui redevient photo sous le curseur.
 *
 * Adapté du composant ASCII Reveal d'Originkit (livré avec sa section
 * `features-04`). Le principe est le sien : l'image est échantillonnée dans un
 * canvas minuscule d'une case par caractère, chaque case donne une luminance,
 * la luminance choisit un glyphe dans une rampe, et le tout est peint une fois
 * dans un canvas hors écran. Le survol dessine ensuite la vraie photo par
 * dessus, découpée par une traînée de disques flous qui suit le pointeur.
 *
 * Trois écarts avec l'original, tous sur le coût :
 *
 *  1. la construction de l'ASCII (des milliers de `fillText`) attend que le
 *     cadre entre dans le viewport. Trois vignettes qui se construisent au
 *     chargement, c'est un à-coup sur le premier rendu pour un dessin que
 *     personne ne regarde encore ;
 *  2. la boucle rAF ne tourne QUE pendant que le pointeur est dans le cadre.
 *     L'original la lance dès que l'image est chargée et ne l'arrête jamais ;
 *  3. `prefers-reduced-motion` coupe le révélateur : l'ASCII reste, fixe. Ce
 *     n'est pas une décoration en trop, c'est l'illustration elle-même.
 */
type AsciiImageProps = {
  src: string;
  /** Décrit ce que montre la PHOTO, pas l'effet. Vide si purement décoratif. */
  alt?: string;
  /** Rampe de glyphes, du plus sombre au plus clair. */
  ramp?: string;
  /** Largeur d'une cellule à l'écran, en px CSS. Plus grand = ASCII plus gros. */
  pitch?: number;
  /** Couleur des caractères. */
  ink?: string;
  /** Recadrage vertical quand l'image déborde, 0 = haut, 100 = bas. */
  focusY?: number;
  /** Contraste appliqué à la luminance après normalisation. */
  contrast?: number;
  /** Étire la luminance sur la plage réellement présente dans l'image, en
   *  ignorant ce pourcentage de pixels aux deux extrêmes. 0 désactive. */
  autoLevels?: number;
  /** Rayon du disque de révélation, en px CSS. */
  revealSize?: number;
  className?: string;
};

/** Nombre de disques dans la traînée : le premier suit le pointeur, chacun des
 *  suivants suit le précédent, d'où la comète qui s'étire quand on va vite. */
const TRAIL = 5;

export function AsciiImage({
  src,
  alt = "",
  ramp = " .:-=+*#%@",
  pitch = 3.2,
  ink = "#8f8f9b",
  focusY = 50,
  contrast = 108,
  autoLevels = 1.5,
  revealSize = 62,
  className,
}: AsciiImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cleanups: Array<() => void> = [];

    // Calques hors écran : l'ASCII (peint une fois), la photo découpée, et le
    // masque de disques. Créés à la demande, réutilisés à chaque frame.
    let asciiLayer: HTMLCanvasElement | null = null;
    let photoLayer: HTMLCanvasElement | null = null;
    let maskLayer: HTMLCanvasElement | null = null;
    let image: HTMLImageElement | null = null;
    let cover = { dx: 0, dy: 0, dw: 0, dh: 0 };

    const trail = Array.from({ length: TRAIL }, () => ({ x: 0, y: 0 }));
    let seeded = false;
    const pointer = { x: 0, y: 0, inside: false };
    let raf = 0;

    const layer = (existing: HTMLCanvasElement | null) => {
      const el = existing ?? document.createElement("canvas");
      if (el.width !== canvas.width || el.height !== canvas.height) {
        el.width = canvas.width;
        el.height = canvas.height;
      }
      return el;
    };

    /** Place l'image en « cover » dans la boîte, recadrée selon focusY. */
    const placeCover = (boxW: number, boxH: number) => {
      if (!image) return { dx: 0, dy: 0, dw: boxW, dh: boxH };
      const scale = Math.max(boxW / image.width, boxH / image.height);
      const dw = image.width * scale;
      const dh = image.height * scale;
      return {
        dx: (boxW - dw) / 2,
        dy: (boxH - dh) * (Math.min(100, Math.max(0, focusY)) / 100),
        dw,
        dh,
      };
    };

    const build = () => {
      if (!image) return;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width === 0 || height === 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);

      const cols = Math.max(8, Math.round(width / pitch));
      const cellW = canvas.width / cols;
      // 1.7 : le pas vertical d'une police monospace pour une chasse donnée.
      // En dessous les lignes se chevauchent, au dessus l'image se déchire.
      const cellH = cellW * 1.7;
      const rows = Math.max(1, Math.floor(canvas.height / cellH));

      cover = placeCover(canvas.width, canvas.height);

      // Échantillonneur d'une case par caractère : c'est LUI qui fait tout le
      // sous-échantillonnage, et le navigateur le fait en natif. Lire la
      // luminance pixel par pixel dans l'image pleine résolution coûterait des
      // ordres de grandeur de plus pour le même résultat.
      const sampler = document.createElement("canvas");
      sampler.width = cols;
      sampler.height = rows;
      const sctx = sampler.getContext("2d", { willReadFrequently: true });
      if (!sctx) return;
      sctx.drawImage(image, cover.dx / cellW, cover.dy / cellH, cover.dw / cellW, cover.dh / cellH);

      let data: Uint8ClampedArray;
      try {
        data = sctx.getImageData(0, 0, cols, rows).data;
      } catch {
        // Canvas teinté (image d'une autre origine) : on renonce à l'ASCII
        // plutôt que de laisser remonter une SecurityError.
        return;
      }

      asciiLayer = layer(asciiLayer);
      const actx = asciiLayer.getContext("2d");
      if (!actx) return;
      actx.clearRect(0, 0, asciiLayer.width, asciiLayer.height);
      actx.font = `${cellH.toFixed(2)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      actx.textBaseline = "top";
      actx.fillStyle = ink;

      // Luminance de chaque case, calculée une fois : elle sert à la fois à
      // mesurer la plage de l'image et à choisir les glyphes.
      const count = cols * rows;
      const lums = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        const p = i * 4;
        lums[i] = (0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]) / 255;
      }

      // Auto-niveaux. Les photos de la page sont très sombres (luminance
      // moyenne autour de 25/255) : sans cet étirement, presque toutes les
      // cases tombent sur le premier cran de la rampe, qui est un espace, et
      // la vignette rend une image quasi vide. Les extrêmes sont écartés par
      // percentile plutôt que par min/max, sinon un seul reflet spéculaire ou
      // un seul pixel noir suffirait à fixer toute la plage.
      let low = 0;
      let high = 1;
      if (autoLevels > 0 && count > 0) {
        const histogram = new Uint32Array(256);
        for (let i = 0; i < count; i++) histogram[Math.round(lums[i] * 255)]++;
        const cut = Math.floor((count * autoLevels) / 100);
        let acc = 0;
        for (let v = 0; v < 256; v++) {
          acc += histogram[v];
          if (acc > cut) {
            low = v / 255;
            break;
          }
        }
        acc = 0;
        for (let v = 255; v >= 0; v--) {
          acc += histogram[v];
          if (acc > cut) {
            high = v / 255;
            break;
          }
        }
        // Image quasi unie : on renonce à l'étirement plutôt que de diviser
        // par un intervalle nul et de transformer du bruit en contraste.
        if (high - low < 0.08) {
          low = 0;
          high = 1;
        }
      }

      const span = high - low || 1;
      const punch = 0.5 + (contrast / 100) * 2;
      const last = ramp.length - 1;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          let lum = (lums[row * cols + col] - low) / span;
          lum = Math.min(1, Math.max(0, (lum - 0.5) * punch + 0.5));
          const glyph = ramp[Math.round(lum * last)];
          if (glyph === " ") continue;
          actx.fillText(glyph, col * cellW, row * cellH);
        }
      }
      paint();
    };

    const paint = () => {
      if (!asciiLayer) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(asciiLayer, 0, 0);
      if (!pointer.inside || !image || reduced) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      photoLayer = layer(photoLayer);
      maskLayer = layer(maskLayer);
      const pctx = photoLayer.getContext("2d");
      const mctx = maskLayer.getContext("2d");
      if (!pctx || !mctx) return;

      pctx.globalCompositeOperation = "source-over";
      pctx.clearRect(0, 0, photoLayer.width, photoLayer.height);
      pctx.drawImage(image, cover.dx, cover.dy, cover.dw, cover.dh);

      mctx.clearRect(0, 0, maskLayer.width, maskLayer.height);
      mctx.save();
      mctx.filter = `blur(${(14 * dpr).toFixed(1)}px)`;
      mctx.fillStyle = "#fff";
      for (let i = 0; i < trail.length; i++) {
        const t = trail.length <= 1 ? 0 : i / (trail.length - 1);
        mctx.beginPath();
        mctx.arc(trail[i].x, trail[i].y, revealSize * dpr * (1 - t * 0.5), 0, Math.PI * 2);
        mctx.fill();
      }
      mctx.restore();

      // destination-in : la photo ne survit que là où le masque est opaque.
      pctx.globalCompositeOperation = "destination-in";
      pctx.drawImage(maskLayer, 0, 0);
      ctx.drawImage(photoLayer, 0, 0);
    };

    const frame = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const tx = pointer.x * dpr;
      const ty = pointer.y * dpr;
      if (!seeded) {
        for (const dot of trail) {
          dot.x = tx;
          dot.y = ty;
        }
        seeded = true;
      } else {
        trail[0].x += (tx - trail[0].x) * 0.35;
        trail[0].y += (ty - trail[0].y) * 0.35;
        for (let i = 1; i < trail.length; i++) {
          trail[i].x += (trail[i - 1].x - trail[i].x) * 0.35;
          trail[i].y += (trail[i - 1].y - trail[i].y) * 0.35;
        }
      }
      paint();
      // La boucle ne survit pas à la sortie du pointeur : hors survol, il n'y
      // a rien à animer, l'ASCII est fixe.
      raf = pointer.inside ? requestAnimationFrame(frame) : 0;
    };

    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.inside =
        pointer.x >= 0 && pointer.y >= 0 && pointer.x <= rect.width && pointer.y <= rect.height;
      if (pointer.inside && !raf && !reduced) raf = requestAnimationFrame(frame);
    };
    const onLeave = () => {
      pointer.inside = false;
      seeded = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      paint();
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    cleanups.push(() => {
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    });

    // Le décodage de l'image ET la construction de l'ASCII attendent l'entrée
    // dans le viewport : trois vignettes qui se peignent au chargement, c'est
    // un à-coup sur le premier rendu pour un dessin que personne ne voit.
    const io = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) return;
      io.disconnect();
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        image = img;
        build();
      };
      img.src = src;
    });
    io.observe(canvas);
    cleanups.push(() => io.disconnect());

    const ro = new ResizeObserver(build);
    ro.observe(canvas);
    cleanups.push(() => ro.disconnect());

    return () => cleanups.forEach((fn) => fn());
  }, [src, ramp, pitch, ink, focusY, contrast, autoLevels, revealSize]);

  return (
    <canvas
      ref={canvasRef}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      className={className ? `ascii-image ${className}` : "ascii-image"}
    />
  );
}

export default AsciiImage;
