// Génère lib/africa-geo.ts : les tracés SVG statiques de l'Afrique et du Bénin.
//
//   node scripts/gen-africa-geo.mjs <ne_50m_admin_0_countries.geojson> [sortie]
//
// Le GeoJSON source (Natural Earth 50m) ne vit pas dans le dépôt : on le
// télécharge au besoin depuis
// https://github.com/nvkelso/natural-earth-vector/raw/master/geojson/ne_50m_admin_0_countries.geojson
//
// Pourquoi un script plutôt qu'un fetch au runtime : le globe WebGL charge déjà
// son GeoJSON depuis GitHub à l'affichage ; ajouter un second appel réseau dans
// le chemin critique du scroll d'intro ferait apparaître l'Afrique en retard,
// ou pas du tout hors ligne.
import fs from "node:fs";
import { geoMercator, geoPath, geoCentroid, geoBounds } from "d3-geo";

const W = 640;
const H = 720;
const PAD = 8;

// Les dépendances insulaires lointaines sortent du calcul de cadrage : sinon
// Maurice et les Seychelles étirent la bounding box et le continent rétrécit.
const OUTLYING = new Set([
  "Seychelles",
  "Mauritius",
  "Cape Verde",
  "Sao Tome and Principe",
  "Comoros",
  "French Southern and Antarctic Lands",
]);

/**
 * Ramer–Douglas–Peucker sur les coordonnées DÉJÀ PROJETÉES.
 *
 * Simplifier en pixels plutôt qu'en degrés est le point clé : la tolérance
 * s'exprime alors dans l'unité où le résultat sera regardé, donc « 0,4 px » veut
 * dire « invisible à l'écran » partout sur la carte, alors qu'une tolérance en
 * degrés couperait beaucoup plus près de l'équateur qu'au Cap.
 */
function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const sqTol = tolerance * tolerance;

  const sqSegDist = (p, a, b) => {
    let [x, y] = a;
    const dx = b[0] - x;
    const dy = b[1] - y;
    if (dx !== 0 || dy !== 0) {
      const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) [x, y] = b;
      else if (t > 0) {
        x += dx * t;
        y += dy * t;
      }
    }
    return (p[0] - x) ** 2 + (p[1] - y) ** 2;
  };

  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let maxSq = 0;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const sq = sqSegDist(points[i], points[first], points[last]);
      if (sq > maxSq) {
        maxSq = sq;
        index = i;
      }
    }
    if (maxSq > sqTol && index > 0) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/** Aire signée d'un anneau : sert à jeter les miettes d'îlots sous-pixel. */
const ringArea = (r) => {
  let a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += r[j][0] * r[i][1] - r[i][0] * r[j][1];
  return Math.abs(a / 2);
};

function toPath(features, projection, { tolerance, minArea }) {
  const out = [];
  for (const feature of features) {
    const g = feature.geometry;
    if (!g) continue;
    const polygons = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
    for (const polygon of polygons) {
      for (const ring of polygon) {
        const projected = ring.map((c) => projection(c)).filter((p) => p && Number.isFinite(p[0]) && Number.isFinite(p[1]));
        if (projected.length < 4) continue;
        if (ringArea(projected) < minArea) continue;
        const pts = simplify(projected, tolerance);
        if (pts.length < 3) continue;
        out.push("M" + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L") + "Z");
      }
    }
  }
  return out.join("");
}

const src = process.argv[2];
const dest = process.argv[3] ?? new URL("../lib/africa-geo.ts", import.meta.url).pathname;
if (!src) {
  console.error("usage: node scripts/gen-africa-geo.mjs <ne_50m_admin_0_countries.geojson> [out.ts]");
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(src, "utf8"));
const africa = raw.features.filter((f) => f.properties.CONTINENT === "Africa");
const benin = africa.find((f) => f.properties.ADMIN === "Benin");
if (!benin) throw new Error("Bénin introuvable dans le GeoJSON source");
const mainland = africa.filter((f) => !OUTLYING.has(f.properties.ADMIN));

const projection = geoMercator().fitExtent(
  [
    [PAD, PAD],
    [W - PAD, H - PAD],
  ],
  { type: "FeatureCollection", features: mainland }
);

// Le continent est vu en entier : 0,4 px de tolérance est déjà sous le seuil du
// visible. Le Bénin, lui, finit zoomé en fin de séquence, donc on le garde net.
const africaPath = toPath(mainland, projection, { tolerance: 0.4, minArea: 3 });
const beninPath = toPath([benin], projection, { tolerance: 0.05, minArea: 0 });

const [x, y] = projection(geoCentroid(benin));
const [[minLon, minLat], [maxLon, maxLat]] = geoBounds(benin);
const [x0, y1] = projection([minLon, minLat]);
const [x1, y0] = projection([maxLon, maxLat]);

const ts = `// GÉNÉRÉ par scripts/gen-africa-geo.mjs. Ne pas éditer à la main.
//
// Contours Afrique + Bénin issus de Natural Earth 50m, projetés en Mercator
// ajusté au continent puis simplifiés en espace écran (Douglas–Peucker), et
// figés ici en chaînes SVG pour qu'aucun appel réseau ne s'ajoute au scroll
// d'intro.
//
// Les deux tracés partagent la MÊME projection : le Bénin se superpose donc au
// pixel près à sa place dans le continent, sans recalage.

/** viewBox commune aux deux tracés. */
export const AFRICA_VIEWBOX = { width: ${W}, height: ${H} };

/** Tous les pays du continent en un seul tracé : rempli il donne la silhouette,
 *  tracé il donne les frontières intérieures. */
export const AFRICA_PATH =
  "${africaPath}";

/** Le Bénin seul, à sa place dans la projection ci-dessus. */
export const BENIN_PATH =
  "${beninPath}";

/** Centroïde projeté du Bénin : ancre de l'étiquette et du halo. */
export const BENIN_CENTROID = { x: ${x.toFixed(1)}, y: ${y.toFixed(1)} };

/** Boîte englobante projetée du Bénin : sert à calculer le zoom final. */
export const BENIN_BBOX = {
  x: ${x0.toFixed(1)},
  y: ${y0.toFixed(1)},
  width: ${(x1 - x0).toFixed(1)},
  height: ${(y1 - y0).toFixed(1)},
};
`;

fs.writeFileSync(dest, ts);
console.log(`africa: ${africaPath.length} chars`);
console.log(`benin:  ${beninPath.length} chars`);
console.log(`benin bbox: ${(x1 - x0).toFixed(1)}x${(y1 - y0).toFixed(1)} at ${x0.toFixed(1)},${y0.toFixed(1)}`);
