/**
 * THE EARTH, IN WATERCOLOUR — the drawing for "Earth we live on".
 *
 * The real world, not a guess at it: the coastlines are Natural Earth's
 * (`lib/globe/land.ts`) and every patch of colour is the land cover under it
 * (`paintAt`, from NASA's Blue Marble — forest, grass, savanna, desert, rock,
 * tundra, ice). They are projected onto a sphere seen from above the Atlantic
 * and painted the way the landing's film paints: a pencil outline of the
 * globe, the sea laid in as one wash that darkens toward the rim, each
 * landmass washed in the colour of its ground and then dabbed over with the
 * colour of each place on it, the coasts in pencil last, and a few white wisps
 * of cloud.
 *
 * It says what the entry says without a word: it is more water than land.
 */

import { LAND } from '@/lib/globe/land';
import { PAINTS } from '@/lib/globe/colours';
import { paintAt, isSea } from '@/lib/globe/marks';
import { between, rng } from '@/lib/film/random';
import { blob, Wash, type Pt } from '@/lib/film/wash';
import { pencil, type Stroke } from '@/lib/film/pencil';

const DEG = Math.PI / 180;

/** Watercolour for each of the colour grid's paints. */
const PIGMENT: Record<(typeof PAINTS)[number], string> = {
  deep: '#2f5f95',
  sea: '#4a7fb3',
  shallow: '#7fb0cf',
  forest: '#4f7f3f',
  grass: '#8fb055',
  savanna: '#c2ad62',
  desert: '#e0bf85',
  rock: '#a08c74',
  tundra: '#b3b394',
  ice: '#eef2f7',
};

export interface Drawing {
  ink: Stroke[];
  washes: Wash[];
}

/** Paint the Earth seen from (lon0, lat0), centred at (cx, cy) with radius R. */
export function earth(cx: number, cy: number, R: number, lon0 = -28, lat0 = 18, seed = 424): Drawing {
  const r = rng(seed);
  const ink: Stroke[] = [];
  const washes: Wash[] = [];
  const s0 = Math.sin(lat0 * DEG);
  const c0 = Math.cos(lat0 * DEG);

  /** Orthographic projection; points round the back are pushed out onto the rim. */
  const project = (lon: number, lat: number): { p: Pt; front: boolean } => {
    const l = (lon - lon0) * DEG;
    const f = lat * DEG;
    const x = Math.cos(f) * Math.sin(l);
    const y = c0 * Math.sin(f) - s0 * Math.cos(f) * Math.cos(l);
    const cosc = s0 * Math.sin(f) + c0 * Math.cos(f) * Math.cos(l);
    if (cosc >= 0) return { p: [cx + x * R, cy - y * R], front: true };
    const k = 1 / Math.max(1e-6, Math.hypot(x, y));
    return { p: [cx + x * k * R, cy - y * k * R], front: false };
  };
  const circle = (rad: number, n = 48): Pt[] => Array.from({ length: n }, (_, k) => [cx + Math.cos((k / n) * 2 * Math.PI) * rad, cy + Math.sin((k / n) * 2 * Math.PI) * rad] as Pt);

  // The globe, first as a pencil circle, gone round twice.
  ink.push(pencil([...circle(R, 72), circle(R, 72)[0]], r, { width: 1.2, tone: 0.85, overshoot: 4 }));
  ink.push(pencil([...circle(R + 1.5, 72), circle(R + 1.5, 72)[0]], r, { width: 0.7, tone: 0.35, overshoot: 8 }));

  // A loose wash of sky behind it first, running out into the paper — the
  // vignette a sketchbook painting sits in.
  washes.push(new Wash(blob(cx + R * 0.06, cy + R * 0.04, R * 1.28, R * 1.2, r, 11), { color: '#c3d3e3', layers: 10, alpha: 0.035, spread: 0.45, edge: 0.15, grain: 18 }, r));

  // The sea: one wash, then the rim darkened, then light caught top-left.
  washes.push(new Wash(circle(R * 0.99), { color: PIGMENT.sea, layers: 18, alpha: 0.085, spread: 0.04, edge: 0.7, grain: 12 }, r));
  // Granulation: ultramarine settling into the paper's pits across the sea.
  for (let k = 0; k < 26; k++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * R * 0.85;
    washes.push(new Wash(blob(cx + Math.cos(a) * d, cy + Math.sin(a) * d, R * 0.14, R * 0.08, r), { color: '#2d5a92', layers: 4, alpha: 0.05, spread: 0.45, edge: 0.3 }, r));
  }
  washes.push(new Wash([...circle(R * 0.99, 40), ...circle(R * 0.8, 40).reverse()], { color: PIGMENT.deep, layers: 10, alpha: 0.06, spread: 0.05, edge: 0.2 }, r));

  // The land: each landmass in the colour of most of its ground.
  const landWashes: Wash[] = [];
  for (const ring of LAND) {
    const pts: Pt[] = [];
    let seen = 0;
    const tally = new Map<number, number>();
    for (let i = 0; i < ring.length; i += 2) {
      const { p, front } = project(ring[i], ring[i + 1]);
      pts.push(p);
      if (front) seen++;
    }
    if (seen < 3) continue;
    for (let i = 0; i < ring.length; i += 6) {
      const k = paintAt(ring[i] + 0.3, ring[i + 1] + 0.3);
      if (!isSea(k)) tally.set(k, (tally.get(k) ?? 0) + 1);
    }
    const main = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? PAINTS.indexOf('grass');
    landWashes.push(new Wash(pts, { color: PIGMENT[PAINTS[main]], layers: 12, alpha: 0.09, spread: 0.08, edge: 0.55, grain: 10 }, r));
    // The coast, in pencil, only where it faces us.
    let run: Pt[] = [];
    const flush = () => {
      if (run.length > 1) ink.push(pencil(run, r, { width: 0.7, tone: 0.55, wobble: 0.3, overshoot: 0 }));
      run = [];
    };
    for (let i = 0; i <= ring.length; i += 2) {
      const j = i % ring.length;
      const { p, front } = project(ring[j], ring[j + 1]);
      if (front) run.push(p);
      else flush();
    }
    flush();
  }
  washes.push(...landWashes);

  // Then the colour of each place, washed wet-in-wet and kept inside the
  // coasts: broad soft patches of each ground's pigment, clipped to the land
  // so none of it bleeds into the sea.
  const landPath = new Path2D();
  for (const ring of LAND) {
    let seen = 0;
    const pts: Pt[] = [];
    for (let i = 0; i < ring.length; i += 2) {
      const { p, front } = project(ring[i], ring[i + 1]);
      pts.push(p);
      if (front) seen++;
    }
    if (seen < 3) continue;
    pts.forEach(([x, y], i) => (i ? landPath.lineTo(x, y) : landPath.moveTo(x, y)));
    landPath.closePath();
  }
  const clipped = (w: Wash): Wash =>
    Object.assign(Object.create(Object.getPrototypeOf(w)), w, {
      pass(ctx: CanvasRenderingContext2D, i: number) {
        ctx.save();
        ctx.clip(landPath);
        w.pass(ctx, i);
        ctx.restore();
      },
    });
  for (let lat = -80; lat <= 80; lat += 7) {
    for (let lon = -180; lon < 180; lon += 7 / Math.max(0.3, Math.cos(lat * DEG))) {
      const { p, front } = project(lon + between(r, -2, 2), lat + between(r, -2, 2));
      if (!front) continue;
      const k = paintAt(lon, lat);
      if (isSea(k)) continue;
      const d = Math.hypot(p[0] - cx, p[1] - cy) / R;
      const size = R * 0.09 * Math.sqrt(Math.max(0.12, 1 - d * d));
      washes.push(clipped(new Wash(blob(p[0], p[1], size * 1.5, size, r, 9), { color: PIGMENT[PAINTS[k]], layers: 6, alpha: 0.075, spread: 0.4, edge: 0.45 }, r)));
    }
  }
  // Mountains and deserts pooled darker, where the pigment settles.
  for (let k = 0; k < 40; k++) {
    const lon = between(r, -120, 60);
    const lat = between(r, -50, 70);
    const { p, front } = project(lon, lat);
    const g = paintAt(lon, lat);
    if (!front || isSea(g)) continue;
    washes.push(clipped(new Wash(blob(p[0], p[1], R * 0.05, R * 0.03, r, 7), { color: g === PAINTS.indexOf('desert') ? '#c98f55' : '#3f6a34', layers: 4, alpha: 0.1, spread: 0.4, edge: 0.6 }, r)));
  }

  // The sphere's light: the sun from the upper left, so the lower right
  // sinks into ultramarine. Three glazes, each a disc offset further toward
  // the light and lifted out of the shade, clipped to the globe — the
  // shading grades softly round the curve instead of stopping at an edge.
  const sphere = new Path2D();
  sphere.arc(cx, cy, R * 0.995, 0, Math.PI * 2);
  const inSphere = (w: Wash): Wash =>
    Object.assign(Object.create(Object.getPrototypeOf(w)), w, {
      pass(ctx: CanvasRenderingContext2D, i: number) {
        ctx.save();
        ctx.clip(sphere);
        w.pass(ctx, i);
        ctx.restore();
      },
    });
  const glaze = (layers: number, paint: (ctx: CanvasRenderingContext2D) => void): Wash =>
    Object.assign(Object.create(Object.getPrototypeOf(washes[0])), { layers, pass: (ctx: CanvasRenderingContext2D) => paint(ctx) });
  washes.push(
    glaze(8, (ctx) => {
      const g = ctx.createRadialGradient(cx - R * 0.45, cy - R * 0.45, R * 0.2, cx - R * 0.2, cy - R * 0.2, R * 1.45);
      g.addColorStop(0, 'rgba(35,59,106,0)');
      g.addColorStop(0.55, 'rgba(35,59,106,0.02)');
      g.addColorStop(1, 'rgba(24,40,78,0.11)');
      ctx.save();
      ctx.fillStyle = g;
      ctx.fill(sphere);
      ctx.restore();
    }),
  );

  // Clouds: soft white wisps that lie along the latitudes, the way weather
  // wraps the planet — thin where they trail off, fuller in the middle.
  for (const band of [-50, -14, 6, 36, 54]) {
    for (let k = 0; k < 3; k++) {
      const lon0 = between(r, -80, 30);
      const len = between(r, 22, 40);
      for (let t = 0; t <= 1; t += 0.25) {
        const { p, front } = project(lon0 + t * len, band + between(r, -2, 2));
        if (!front) continue;
        const d = Math.hypot(p[0] - cx, p[1] - cy) / R;
        const fore = Math.sqrt(Math.max(0.1, 1 - d * d));
        const full = Math.sin(t * Math.PI) * 0.7 + 0.3;
        washes.push(inSphere(new Wash(blob(p[0], p[1], R * 0.1 * full, R * 0.03 * full * (0.5 + fore * 0.5), r, 11), { color: '#ffffff', layers: 7, alpha: 0.13, spread: 0.45, edge: 0 }, r)));
      }
    }
  }
  // The air: a thin pale glow round the rim, and light caught on the sea.
  washes.push(new Wash([...circle(R * 1.06, 60), ...circle(R * 1.0, 60).reverse()], { color: '#bcd6ec', layers: 8, alpha: 0.08, spread: 0.1, edge: 0 }, r));
  washes.push(new Wash(blob(cx - R * 0.4, cy - R * 0.42, R * 0.22, R * 0.14, r), { color: '#eef5fa', layers: 6, alpha: 0.14, spread: 0.3, edge: 0 }, r));
  return { ink, washes };
}
