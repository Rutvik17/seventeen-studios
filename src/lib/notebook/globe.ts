/**
 * THE EARTH, IN WATERCOLOUR — the painting for "Earth we live on".
 *
 * Painted the way the landing's film paints Nvidia's campus: sketched in
 * pencil, then laid in with washes, a glaze at a time — and then left alive.
 *
 * The planet hangs in a night sky painted wet-in-wet — indigo and violet,
 * darkest at its ragged edges where it runs out into the white of the page,
 * with stars flicked off the brush and a small moon. The sun is off to the
 * left: the day side is washed in the real world's colours, the night side
 * sinks under a glaze of indigo, and a band of pale air rims the whole disc.
 *
 * The world is the real one: coastlines from Natural Earth
 * (`lib/globe/land.ts`), and every patch of colour the land cover under it
 * (`paintAt`, from NASA's Blue Marble — forest, grass, savanna, desert, rock,
 * tundra, ice). The cities lit on the night side are real cities, at their
 * real places.
 *
 * Once painted it keeps moving (`live`): clouds drift east along their
 * latitudes, dimming as they cross into the night; the cities twinkle; the
 * stars catch the light.
 */

import { LAND } from '@/lib/globe/land';
import { PAINTS } from '@/lib/globe/colours';
import { paintAt, isSea } from '@/lib/globe/marks';
import { between, pick, rng } from '@/lib/film/random';
import { blob, Wash, type Pt } from '@/lib/film/wash';
import { curve, pencil, type Stroke } from '@/lib/film/pencil';

const DEG = Math.PI / 180;

const PIGMENT: Record<(typeof PAINTS)[number], string> = {
  deep: '#24548c',
  sea: '#3f78b0',
  shallow: '#78b2cf',
  forest: '#3f7a38',
  grass: '#86ad4d',
  savanna: '#c4a758',
  desert: '#e2b97a',
  rock: '#9c8468',
  tundra: '#aeb08f',
  ice: '#f1f4f8',
};

/** Real cities, [longitude, latitude], lit when they are on the night side. */
const CITIES: Pt[] = [
  [31.2, 30], [46.7, 24.7], [55.3, 25.2], [51.4, 35.7], [44.4, 33.3], [36.8, -1.3], [39.3, -6.8], [32.6, 0.3], [38.7, 9],
  [72.9, 19.1], [77.2, 28.6], [88.4, 22.6], [80.3, 13.1], [67, 24.9], [74.3, 31.5], [37.6, 55.8], [30.3, 59.9], [49.1, 55.8],
  [60.6, 56.8], [28.9, 41], [32.9, 39.9], [44.8, 41.7], [69.2, 41.3], [76.9, 43.2], [30.5, 50.4], [27.6, 53.9], [18.1, 59.3],
  [21, 52.2], [24.9, 60.2], [47.5, -18.9], [57.5, -20.2], [35.2, 31.8], [35.5, 33.9], [58.4, 23.6], [50.6, 26.2],
];

export interface Drawing {
  ink: Stroke[];
  washes: Wash[];
  /** What keeps moving once the painting is done, drawn over it each frame; `a` fades it in. */
  live?: (ctx: CanvasRenderingContext2D, t: number, a: number) => void;
}

/** A glaze that is not a shape — a gradient — laid a pass at a time. */
function glaze(layers: number, paint: (ctx: CanvasRenderingContext2D) => void): Wash {
  return Object.assign(Object.create(Wash.prototype), { layers, cx: NaN, cy: NaN, pass: (ctx: CanvasRenderingContext2D) => paint(ctx) });
}

/** A wash kept inside a path: the land's colours inside the coasts, the sea inside the disc. */
function within(path: Path2D, w: Wash): Wash {
  return Object.assign(Object.create(Object.getPrototypeOf(w)), w, {
    pass(ctx: CanvasRenderingContext2D, i: number) {
      ctx.save();
      ctx.clip(path);
      w.pass(ctx, i);
      ctx.restore();
    },
  });
}

/** Paint the Earth scene into a page `w` × `h`. */
export function earth(w: number, h: number, seed = 424): Drawing {
  const r = rng(seed);
  const ink: Stroke[] = [];
  const washes: Wash[] = [];
  const R = Math.min(w * 0.3, h * 0.33);
  const cx = w * 0.5;
  const cy = h * 0.44;
  const lon0 = 12;
  const lat0 = 16;
  const s0 = Math.sin(lat0 * DEG);
  const c0 = Math.cos(lat0 * DEG);
  // The sun: to the left, a little above.
  const SUN = (() => {
    const v = [-0.92, 0.18, 0.35];
    const l = Math.hypot(...v);
    return v.map((c) => c / l);
  })();

  /** Orthographic projection: the point on screen, whether it faces us, and its unit normal (x right, y up, z toward us). */
  const project = (lon: number, lat: number) => {
    const l = (lon - lon0) * DEG;
    const f = lat * DEG;
    const x = Math.cos(f) * Math.sin(l);
    const y = c0 * Math.sin(f) - s0 * Math.cos(f) * Math.cos(l);
    const z = s0 * Math.sin(f) + c0 * Math.cos(f) * Math.cos(l);
    return { p: [cx + x * R, cy - y * R] as Pt, front: z >= 0, x, y, z };
  };
  const lightAt = (x: number, y: number, z: number) => x * SUN[0] + y * SUN[1] + z * SUN[2];
  const circle = (rad: number, n = 60, ox = cx, oy = cy): Pt[] => Array.from({ length: n }, (_, k) => [ox + Math.cos((k / n) * 2 * Math.PI) * rad, oy + Math.sin((k / n) * 2 * Math.PI) * rad] as Pt);
  const sphere = new Path2D();
  sphere.arc(cx, cy, R, 0, Math.PI * 2);

  /* ---------------- the pencil ---------------- */

  // The frame of the sky, loosely, then the globe gone round twice.
  const box: Pt[] = [[w * 0.07, h * 0.06], [w * 0.93, h * 0.07], [w * 0.92, h * 0.8], [w * 0.08, h * 0.81]];
  for (let k = 0; k < 4; k++) ink.push(pencil([box[k], box[(k + 1) % 4]], r, { width: 0.6, tone: 0.25, overshoot: 8 }));
  ink.push(pencil([...circle(R, 90), circle(R, 90)[0]], r, { width: 1.3, tone: 0.9, overshoot: 5 }));
  ink.push(pencil([...circle(R + 2, 90), circle(R + 2, 90)[0]], r, { width: 0.6, tone: 0.3, overshoot: 10 }));
  const moon: Pt = [w * 0.82, h * 0.17];
  const mR = R * 0.1;
  ink.push(pencil([...circle(mR, 30, moon[0], moon[1]), circle(mR, 30, moon[0], moon[1])[0]], r, { width: 0.8, tone: 0.7, overshoot: 2 }));

  // Coasts, where they face us; each landmass's outline, for its washes.
  const landPath = new Path2D();
  const landRings: { pts: Pt[]; main: number }[] = [];
  for (const ring of LAND) {
    const pts: Pt[] = [];
    let seen = 0;
    const tally = new Map<number, number>();
    let run: Pt[] = [];
    const flush = () => {
      if (run.length > 1) ink.push(pencil(run, r, { width: 0.75, tone: 0.6, wobble: 0.3, overshoot: 0 }));
      run = [];
    };
    for (let i = 0; i < ring.length; i += 2) {
      const q = project(ring[i], ring[i + 1]);
      if (q.front) {
        seen++;
        run.push(q.p);
      } else flush();
      // Round the back, the point is pushed out to the rim so the shape still closes.
      const k = 1 / Math.max(1e-6, Math.hypot(q.x, q.y));
      pts.push(q.front ? q.p : [cx + q.x * k * R, cy - q.y * k * R]);
      if (i % 6 === 0) {
        const g = paintAt(ring[i] + 0.3, ring[i + 1] + 0.3);
        if (!isSea(g)) tally.set(g, (tally.get(g) ?? 0) + 1);
      }
    }
    flush();
    if (seen < 3) continue;
    pts.forEach(([x, y], i) => (i ? landPath.lineTo(x, y) : landPath.moveTo(x, y)));
    landPath.closePath();
    landRings.push({ pts, main: [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? PAINTS.indexOf('grass') });
  }
  // The graticule, faintly, every thirty degrees.
  const graticule = (pts: [number, number][]) => {
    let run: Pt[] = [];
    for (const [lon, lat] of pts) {
      const q = project(lon, lat);
      if (q.front) run.push(q.p);
      else if (run.length) {
        if (run.length > 1) ink.push(pencil(run, r, { width: 0.4, tone: 0.16, overshoot: 0 }));
        run = [];
      }
    }
    if (run.length > 1) ink.push(pencil(run, r, { width: 0.4, tone: 0.16, overshoot: 0 }));
  };
  for (let lon = -180; lon < 180; lon += 30) graticule(Array.from({ length: 45 }, (_, k) => [lon, -88 + k * 4] as [number, number]));
  for (let lat = -60; lat <= 60; lat += 30) graticule(Array.from({ length: 91 }, (_, k) => [-180 + k * 4, lat] as [number, number]));
  // A storm spiral over the South Atlantic, drawn before it is painted.
  const storm = project(-18, -38);
  const spiral: Pt[] = Array.from({ length: 26 }, (_, k) => {
    const a = k * 0.5;
    const rr = R * 0.012 * k;
    return [storm.p[0] + Math.cos(a) * rr, storm.p[1] + Math.sin(a) * rr * 0.6] as Pt;
  });
  ink.push(pencil(curve(spiral, 2), r, { width: 0.5, tone: 0.35, overshoot: 0 }));

  /* ---------------- the sky ---------------- */

  const sky: Pt[] = [];
  for (let k = 0; k < 28; k++) {
    const a = (k / 28) * Math.PI * 2;
    const ex = Math.cos(a);
    const ey = Math.sin(a);
    // A rounded rectangle, ragged at its edge.
    const sx = Math.sign(ex) * Math.pow(Math.abs(ex), 0.35);
    const sy = Math.sign(ey) * Math.pow(Math.abs(ey), 0.35);
    sky.push([w * 0.5 + sx * w * 0.43 * between(r, 0.94, 1.02), h * 0.435 + sy * h * 0.37 * between(r, 0.93, 1.02)]);
  }
  const skyPath = new Path2D();
  sky.forEach(([x, y], i) => (i ? skyPath.lineTo(x, y) : skyPath.moveTo(x, y)));
  skyPath.closePath();
  washes.push(new Wash(sky, { color: '#2a2f63', layers: 14, alpha: 0.11, spread: 0.12, edge: 0.4, grain: 16 }, r));
  for (const [x, y, rx, ry, c] of [
    [0.25, 0.25, 0.22, 0.16, '#4a3a86'],
    [0.75, 0.6, 0.24, 0.16, '#1c3a78'],
    [0.2, 0.68, 0.2, 0.12, '#3a2d6e'],
    [0.7, 0.2, 0.18, 0.12, '#233d80'],
  ] as const) washes.push(within(skyPath, new Wash(blob(w * x, h * y, w * rx, h * ry, r, 10), { color: c, layers: 10, alpha: 0.045, spread: 0.55, edge: 0.1 }, r)));
  // Darker toward the ragged edge, where the paint pooled as it dried.
  washes.push(new Wash([...sky, ...sky.map(([x, y]) => [w * 0.5 + (x - w * 0.5) * 0.8, h * 0.435 + (y - h * 0.435) * 0.78] as Pt).reverse()], { color: '#151a3d', layers: 8, alpha: 0.06, spread: 0.1, edge: 0.3 }, r));
  // Stars, flicked off a loaded brush: white paint on the dark.
  const stars: { x: number; y: number; s: number; p: number }[] = [];
  for (let k = 0; k < 150; k++) {
    const x = between(r, w * 0.09, w * 0.91);
    const y = between(r, h * 0.08, h * 0.79);
    if (Math.hypot(x - cx, y - cy) < R * 1.12 || Math.hypot(x - moon[0], y - moon[1]) < mR * 1.5) continue;
    const s = Math.pow(r(), 3) * 2.4 + 0.6;
    stars.push({ x, y, s, p: r() * 6.28 });
    if (s > 1.3) washes.push(within(skyPath, new Wash(blob(x, y, s, s, r, 6), { color: '#fbf8ee', layers: 3, alpha: 0.45, spread: 0.2, edge: 0 }, r)));
  }
  // The moon: pale, a shadowed sea or two on it.
  washes.push(new Wash(circle(mR, 20, moon[0], moon[1]), { color: '#f3eedd', layers: 8, alpha: 0.35, spread: 0.06, edge: 0.4 }, r));
  washes.push(new Wash(blob(moon[0] + mR * 0.3, moon[1] + mR * 0.2, mR * 0.5, mR * 0.45, r, 8), { color: '#c9c2ad', layers: 4, alpha: 0.2, spread: 0.2, edge: 0.3 }, r));

  /* ---------------- the planet ---------------- */

  // The air round it: a soft ring of pale blue light.
  washes.push(
    glaze(10, (ctx) => {
      const g = ctx.createRadialGradient(cx, cy, R * 0.96, cx, cy, R * 1.16);
      g.addColorStop(0, 'rgba(160,210,245,0.07)');
      g.addColorStop(1, 'rgba(160,210,245,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.16, 0, Math.PI * 2);
      ctx.fill();
    }),
  );
  // The sea: glazed deep blue, granulating as ultramarine does.
  washes.push(within(sphere, new Wash(circle(R * 1.03), { color: PIGMENT.sea, layers: 18, alpha: 0.1, spread: 0.03, edge: 0.6, grain: 12 }, r)));
  for (let k = 0; k < 34; k++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * R * 0.9;
    washes.push(within(sphere, new Wash(blob(cx + Math.cos(a) * d, cy + Math.sin(a) * d, R * 0.14, R * 0.08, r), { color: pick(r, ['#2a5f98', '#35709f', '#1f4f86']), layers: 4, alpha: 0.06, spread: 0.45, edge: 0.4 }, r)));
  }
  // Shallow water round the coasts, paler.
  for (const ring of landRings) washes.push(within(sphere, new Wash(ring.pts, { color: PIGMENT.shallow, layers: 4, alpha: 0.1, spread: 0.18, edge: 0.1, grain: 8 }, r)));
  // Each landmass in its main ground's colour…
  for (const ring of landRings) washes.push(within(sphere, new Wash(ring.pts, { color: PIGMENT[PAINTS[ring.main]], layers: 12, alpha: 0.1, spread: 0.06, edge: 0.55, grain: 8 }, r)));
  // …then each place in its own, wet-in-wet, kept inside the coasts.
  for (let lat = -80; lat <= 82; lat += 5) {
    for (let lon = -180; lon < 180; lon += 5 / Math.max(0.3, Math.cos(lat * DEG))) {
      const q = project(lon + between(r, -1.5, 1.5), lat + between(r, -1.5, 1.5));
      if (!q.front) continue;
      const g = paintAt(lon, lat);
      if (isSea(g)) continue;
      const size = R * 0.07 * Math.sqrt(Math.max(0.12, q.z));
      washes.push(within(landPath, new Wash(blob(q.p[0], q.p[1], size * 1.5, size, r, 9), { color: PIGMENT[PAINTS[g]], layers: 5, alpha: 0.09, spread: 0.42, edge: 0.45 }, r)));
    }
  }
  // Mountains and deserts pooled darker where the pigment settled.
  for (let k = 0; k < 60; k++) {
    const lon = between(r, -110, 120);
    const lat = between(r, -55, 70);
    const q = project(lon, lat);
    const g = paintAt(lon, lat);
    if (!q.front || isSea(g)) continue;
    const dry = g === PAINTS.indexOf('desert') || g === PAINTS.indexOf('savanna');
    washes.push(within(landPath, new Wash(blob(q.p[0], q.p[1], R * 0.05, R * 0.028, r, 7), { color: dry ? '#c07f45' : '#2f5f2c', layers: 4, alpha: 0.11, spread: 0.4, edge: 0.6 }, r)));
  }
  // The storm, a pale swirl.
  washes.push(within(sphere, new Wash(blob(storm.p[0], storm.p[1], R * 0.16, R * 0.08, r, 11), { color: '#f3f6fa', layers: 6, alpha: 0.18, spread: 0.35, edge: 0.1 }, r)));

  // Day and night: the side away from the sun sinks under indigo, laid in
  // ten thin glazes so it shades round the curve and past the terminator.
  const sx = cx + SUN[0] * R * 0.5;
  const sy = cy - SUN[1] * R * 0.5;
  for (let k = 0; k < 10; k++)
    washes.push(
      glaze(1, (ctx) => {
        const g = ctx.createRadialGradient(sx, sy, R * 0.3, sx + (cx - sx) * 1.6, sy + (cy - sy) * 1.6, R * 1.35);
        g.addColorStop(0, 'rgba(18,24,62,0)');
        g.addColorStop(0.42, 'rgba(18,24,62,0.03)');
        g.addColorStop(0.72, 'rgba(14,18,50,0.11)');
        g.addColorStop(1, 'rgba(10,12,38,0.16)');
        ctx.save();
        ctx.clip(sphere);
        ctx.fillStyle = g;
        ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
        ctx.restore();
      }),
    );
  // Light caught on the sea, toward the sun.
  washes.push(within(sphere, new Wash(blob(cx - R * 0.45, cy - R * 0.15, R * 0.2, R * 0.13, r), { color: '#e6f1f8', layers: 6, alpha: 0.12, spread: 0.3, edge: 0 }, r)));

  /* ---------------- what keeps moving ---------------- */

  // Cloud sprites, painted once each: a soft white streak.
  const sprite = (seed2: number) => {
    const c = document.createElement('canvas');
    c.width = 160;
    c.height = 60;
    const x = c.getContext('2d')!;
    const q = rng(seed2);
    for (let k = 0; k < 6; k++) new Wash(blob(38 + k * 17 + between(q, -6, 6), 30 + between(q, -5, 5), between(q, 20, 30), between(q, 10, 15), q, 11), { color: '#ffffff', layers: 7, alpha: 0.12, spread: 0.5, edge: 0 }, q).paint(x);
    return c;
  };
  const sprites = typeof document === 'undefined' ? [] : Array.from({ length: 5 }, (_, k) => sprite(900 + k));
  const clouds = Array.from({ length: 36 }, () => ({
    lon: between(r, -180, 180),
    lat: pick(r, [-52, -45, -12, -6, 6, 10, 38, 46, 55]) + between(r, -4, 4),
    speed: between(r, 1.2, 2.6),
    size: between(r, 0.8, 1.4),
    art: sprites.length ? pick(r, sprites) : null,
  }));
  const lights = CITIES.map(([lon, lat]) => ({ lon, lat, p: r() * 6.28 }));

  const live = (ctx: CanvasRenderingContext2D, t: number, a: number) => {
    ctx.save();
    // Stars twinkle.
    ctx.save();
    ctx.clip(skyPath);
    ctx.fillStyle = '#fffaf0';
    for (const s of stars) {
      ctx.globalAlpha = a * (0.4 + 0.6 * Math.sin(t * 1.3 + s.p) ** 2) * Math.min(1, s.s / 2);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.s * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.clip(sphere);
    // Clouds drift east with the westerlies and the trades.
    for (const c of clouds) {
      if (!c.art) continue;
      const lon = c.lon + t * c.speed;
      const q = project(lon, c.lat);
      if (!q.front) continue;
      const lit = Math.max(0, lightAt(q.x, q.y, q.z));
      const alpha = a * Math.min(1, q.z * 2.5) * (0.2 + 0.8 * Math.min(1, lit * 2.2));
      if (alpha < 0.02) continue;
      const ahead = project(lon + 3, c.lat);
      const sw = R * 0.34 * c.size;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(q.p[0], q.p[1]);
      ctx.rotate(Math.atan2(ahead.p[1] - q.p[1], ahead.p[0] - q.p[0]));
      // Foreshortened toward the rim, across and along.
      ctx.scale(Math.max(0.25, Math.min(1, Math.hypot(ahead.p[0] - q.p[0], ahead.p[1] - q.p[1]) / (R * 0.05))), Math.max(0.35, q.z));
      ctx.drawImage(c.art, -sw / 2, -sw * 0.19, sw, sw * 0.375);
      ctx.restore();
    }
    // The cities on the night side, twinkling.
    for (const c of lights) {
      const q = project(c.lon, c.lat);
      if (!q.front) continue;
      const dark = -lightAt(q.x, q.y, q.z) + 0.12;
      if (dark <= 0) continue;
      const tw = 0.7 + 0.3 * Math.sin(t * 2.3 + c.p);
      const s = R * 0.028;
      const g = ctx.createRadialGradient(q.p[0], q.p[1], 0, q.p[0], q.p[1], s);
      g.addColorStop(0, `rgba(255,214,140,${(a * Math.min(1, dark * 3) * tw).toFixed(3)})`);
      g.addColorStop(1, 'rgba(255,190,110,0)');
      ctx.fillStyle = g;
      ctx.fillRect(q.p[0] - s, q.p[1] - s, s * 2, s * 2);
    }
    ctx.restore();
    ctx.restore();
  };

  return { ink, washes, live };
}
