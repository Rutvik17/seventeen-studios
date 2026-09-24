/**
 * A continent, sketched on the page beside the globe the way the founder's
 * book sketches its chapters: the name written first, then the coastline in
 * pencil, a stroke at a time with the sketchbook's own hand
 * (`lib/sketchbook/pencil.ts`), the lines to its neighbours dashed in, and a
 * scale bar to finish.
 *
 * Then it is painted in: one paint at a time, lightest first — the ice, the
 * deserts, the grassland, then the forests — each brushed back and forth over
 * its own ground in short strokes (`lib/sketchbook/brush.ts`), wandering from
 * patch to patch to the nearest one not yet done. Each paint goes only where
 * the ground is its colour, from the same map as the globe, so a stroke that
 * strays over the next colour's ground leaves it for that paint.
 *
 * `draw(now)` paints the sketch as it stands `now` into it: the pencil is
 * drawn fresh each frame; the paint is laid onto its own layer, a stroke at a
 * time as each comes due, and only ever added to.
 */

import { clamp01, easeOut, rng, span, type Pt } from '@/lib/sketchbook/geometry';
import { grain, prepare, stroke, type Prepared } from '@/lib/sketchbook/pencil';
import { paintStroke } from '@/lib/sketchbook/brush';
import { borders, CENTRES, coastOf, continentOf, equalArea, regionOf, type ContinentId } from './continents';
import { LAND } from './land';
import { paintAt, paintIndex, isLand, isSea, landPaintNear, type PaintName } from './marks';

const EARTH_KM = 6371;

export type SketchPalette = {
  graphite: string;
  /** One per paint, in `PAINTS` order. */
  paints: string[];
  /** The handwriting face's CSS font-family. */
  hand: string;
};

/** When each part of a sketch is drawn, seconds after it starts. */
const WHEN = {
  name: [0, 0.5],
  coast: [0.25, 1.7],
  borders: [1.5, 2.0],
  colour: [1.8, 4.6],
  scale: [4.3, 4.8],
} as const;

/** The paints in the order they are picked up: lightest first, as colouring in goes. */
const ORDER: readonly PaintName[] = ['ice', 'desert', 'savanna', 'grass', 'tundra', 'rock', 'forest'];

/** How far apart the scribbles are, px, and how long each takes, seconds. */
const SPACING = 11;
const SCRIBBLE = 0.32;
/** Each scribble's strokes, back and forth, and the points along each. */
const STROKES = 4;
const STEPS = 5;

/** A seed for each continent, so each is coloured the same way every time. */
const SEED: Record<ContinentId, number> = { africa: 11, antarctica: 12, asia: 13, europe: 14, 'north-america': 15, oceania: 16, 'south-america': 17 };

/** How long the last sketch takes to fade when another is chosen, seconds. */
const FADE = 0.3;

/** One scribble: a paint's back-and-forth path, which of its steps lie on its own ground, and when it is drawn. */
type Scribble = { paint: number; pts: Pt[]; mine: Uint8Array; start: number };

type Drawn = {
  id: ContinentId;
  name: string;
  lines: { line: Prepared; from: number; to: number }[];
  land: Path2D;
  keep: Path2D;
  without: Path2D[];
  borders: Pt[][];
  scribbles: Scribble[];
  scale: { km: number; px: number };
};

/** A round distance for the scale bar, near a quarter of the sketch's width. */
function niceKm(km: number): number {
  const steps = [100, 200, 250, 500, 1000, 1500, 2000, 2500, 5000];
  return steps.reduce((best, s) => (Math.abs(Math.log(s / km)) < Math.abs(Math.log(best / km)) ? s : best), steps[0]);
}

/** How far along a scribble is at `tau`, 0–1. */
const along = (s: Scribble, tau: number) => clamp01((tau - s.start) / SCRIBBLE);

export function createContinentSketch(canvas: HTMLCanvasElement, pal: SketchPalette) {
  const ctx = canvas.getContext('2d')!;
  const graphite = ctx.createPattern(grain(pal.graphite, 21, 1.4), 'repeat')!;
  let w = 1;
  let h = 1;
  let dpr = 1;
  let current: Drawn | null = null;
  let started = 0;
  let still = false;
  /** The paint so far, and how far along it is. */
  const layer = document.createElement('canvas');
  let colouredTo = -1;
  /** The last sketch, as it stood when the next was chosen, fading out. */
  let leaving: { image: HTMLCanvasElement; at: number } | null = null;

  function prepareContinent(id: ContinentId, name: string): Drawn {
    const [lon0, lat0] = CENTRES[id];
    const view = equalArea(lon0, lat0);
    const coast = coastOf(id).map((run) => {
      const pts: Pt[] = [];
      for (let i = 0; i < run.length; i += 2) pts.push(view.to(run[i], run[i + 1]));
      return pts;
    });
    // Fit the continent into the page, below the name and above the scale
    // bar: its coast, and its land inland of the coast — Russia's reaches to
    // the Urals, well past the last of Europe's coastline.
    const inland: { x: number; y: number }[] = [];
    const reg = regionOf(id).keep;
    const lons = reg.map(([lon]) => lon);
    const lats = reg.map(([, lat]) => lat);
    for (let lat = Math.min(...lats); lat <= Math.max(...lats); lat += 1.5) {
      for (let lon = Math.min(...lons); lon <= Math.max(...lons); lon += 1.5) {
        const l = ((((lon + 180) % 360) + 360) % 360) - 180;
        if (continentOf(l, lat) === id && isLand(l, lat)) inland.push(view.to(l, lat));
      }
    }
    const all = [...coast.flat(), ...inland];
    const [minX, maxX] = [Math.min(...all.map((p) => p.x)), Math.max(...all.map((p) => p.x))];
    const [minY, maxY] = [Math.min(...all.map((p) => p.y)), Math.max(...all.map((p) => p.y))];
    const box = { x: w * 0.07, y: h * 0.17, w: w * 0.86, h: h * 0.68 };
    const s = Math.min(box.w / (maxX - minX), box.h / (maxY - minY));
    const ox = box.x + (box.w - (maxX - minX) * s) / 2 - minX * s;
    const oy = box.y + (box.h - (maxY - minY) * s) / 2 + maxY * s;
    const page = (p: { x: number; y: number }): Pt => ({ x: ox + p.x * s, y: oy - p.y * s });
    const onPage = (lon: number, lat: number) => page(view.to(lon, lat));
    const ground = (p: Pt) => view.from((p.x - ox) / s, (oy - p.y) / s);

    // The coastline: the longest run first, each drawn in its share of the time.
    const runs = coast.map((pts) => pts.map(page));
    const lengths = runs.map((r) => r.reduce((sum, p, i) => (i ? sum + Math.hypot(p.x - r[i - 1].x, p.y - r[i - 1].y) : 0), 0));
    const total = lengths.reduce((a, b) => a + b, 0) || 1;
    let so = 0;
    const [c0, c1] = WHEN.coast;
    const lines = runs.map((pts, i) => {
      const from = c0 + (so / total) * (c1 - c0) * 0.85;
      so += lengths[i];
      return { line: prepare(pts, { seed: 300 + i, width: 1.7, jitter: 0.9, overshoot: 4, passes: 2 }), from, to: from + Math.max(0.12, (lengths[i] / total) * (c1 - c0)) };
    });

    // Where the paint may go: the land, inside this continent's region.
    const land = new Path2D();
    for (const ring of LAND) {
      for (let i = 0; i < ring.length; i += 2) {
        const p = onPage(ring[i], ring[i + 1]);
        if (i) land.lineTo(p.x, p.y);
        else land.moveTo(p.x, p.y);
      }
      land.closePath();
    }
    const outline = (region: readonly (readonly [number, number])[]): Pt[] => {
      const pts: Pt[] = [];
      region.forEach(([lon, lat], i) => {
        const [lon1, lat1] = region[(i + 1) % region.length];
        const steps = Math.max(1, Math.ceil(Math.max(Math.abs(lon1 - lon), Math.abs(lat1 - lat))));
        for (let k = 0; k < steps; k += 1) pts.push(onPage(lon + ((lon1 - lon) * k) / steps, lat + ((lat1 - lat) * k) / steps));
      });
      return pts;
    };
    const path = (pts: Pt[]) => {
      const p = new Path2D();
      pts.forEach((q, i) => (i ? p.lineTo(q.x, q.y) : p.moveTo(q.x, q.y)));
      p.closePath();
      return p;
    };
    const region = regionOf(id);

    // The paint. Places a scribble apart over the continent, each given to
    // the paint of the ground under it.
    const r = rng(SEED[id]);
    const paintOf = (p: Pt) => {
      const g = ground(p);
      const k = paintAt(g.lon, g.lat);
      return isSea(k) ? landPaintNear(g.lon, g.lat) : k;
    };
    const spots = new Map<number, Pt[]>();
    for (let y = oy - maxY * s; y <= oy - minY * s; y += SPACING) {
      for (let x = ox + minX * s; x <= ox + maxX * s; x += SPACING) {
        const p = { x: x + (r() - 0.5) * SPACING * 0.6, y: y + (r() - 0.5) * SPACING * 0.6 };
        const g = ground(p);
        if (continentOf(g.lon, g.lat) !== id || !isLand(g.lon, g.lat)) continue;
        const k = paintOf(p);
        if (!spots.has(k)) spots.set(k, []);
        spots.get(k)!.push(p);
      }
    }
    // Each paint in turn, for a share of the time as big as its share of the
    // ground, going from wherever it starts to the nearest patch not yet done.
    const order = ORDER.map(paintIndex).filter((k) => spots.has(k));
    for (const k of spots.keys()) if (!order.includes(k)) order.push(k);
    const count = [...spots.values()].reduce((n, list) => n + list.length, 0) || 1;
    const [k0, k1] = WHEN.colour;
    let at = k0;
    const scribbles: Scribble[] = [];
    for (const k of order) {
      const todo = spots.get(k)!;
      const share = Math.max(0.25, ((k1 - k0 - SCRIBBLE) * todo.length) / count);
      const angle = ((22 + r() * 30) * Math.PI) / 180;
      let here = todo.reduce((a, b) => (b.x + b.y < a.x + a.y ? b : a));
      const n = todo.length;
      for (let j = 0; j < n; j += 1) {
        todo.splice(todo.indexOf(here), 1);
        scribbles.push(scribbleAt(here, k, angle + (r() - 0.5) * 0.4, at + (j / n) * share, r, paintOf));
        if (todo.length) here = todo.reduce((a, b) => (Math.hypot(b.x - here.x, b.y - here.y) < Math.hypot(a.x - here.x, a.y - here.y) ? b : a));
      }
      at += share;
    }

    // The scale: a round distance, as long as it is at this drawing's scale.
    const pxPerKm = s / EARTH_KM;
    const km = niceKm((w * 0.24) / pxPerKm);
    return {
      id,
      name,
      lines,
      land,
      keep: path(outline(region.keep)),
      without: region.without.map((q) => path(outline(q))),
      borders: borders().map(outline),
      scribbles,
      scale: { km, px: km * pxPerKm },
    };
  }

  /**
   * A scribble round `c`: `STROKES` strokes back and forth at `angle`, a little
   * longer than the gap to the next, with the wobble of a hand — and which of
   * its steps are over ground of paint `k`.
   */
  function scribbleAt(c: Pt, k: number, angle: number, start: number, r: () => number, paintOf: (p: Pt) => number): Scribble {
    const [ux, uy] = [Math.cos(angle), -Math.sin(angle)];
    const [nx, ny] = [-uy, ux];
    const pts: Pt[] = [];
    const gap = 3.4;
    for (let j = 0; j < STROKES; j += 1) {
      const off = (j - (STROKES - 1) / 2) * gap;
      const reach = SPACING * 0.95 + r() * 3;
      const [a, b] = j % 2 ? [reach, -reach] : [-reach, reach];
      for (let q = 0; q <= STEPS - 1; q += 1) {
        const u = a + ((b - a) * q) / (STEPS - 1);
        const wob = (r() - 0.5) * 1.2;
        pts.push({ x: c.x + ux * u + nx * (off + wob), y: c.y + uy * u + ny * (off + wob) });
      }
    }
    const mine = Uint8Array.from(pts, (p, i) => {
      const next = pts[Math.min(i + 1, pts.length - 1)];
      return paintOf({ x: (p.x + next.x) / 2, y: (p.y + next.y) / 2 }) === k ? 1 : 0;
    });
    return { paint: k, pts, mine, start };
  }

  /** Clips to the land of this continent. */
  function clipToContinent(g: CanvasRenderingContext2D, c: Drawn) {
    g.clip(c.land);
    g.clip(c.keep);
    for (const p of c.without) {
      const out = new Path2D();
      out.rect(-w, -h, 3 * w, 3 * h);
      out.addPath(p);
      g.clip(out, 'evenodd');
    }
  }

  /**
   * Lays on the paint from where it had got to up to `tau`: each of a
   * scribble's strokes, whole, once it is due — only the stretches of it over
   * its own ground.
   */
  function colour(c: Drawn, tau: number) {
    if (tau <= colouredTo) return;
    const from = colouredTo;
    colouredTo = tau;
    const g = layer.getContext('2d')!;
    g.save();
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    clipToContinent(g, c);
    c.scribbles.forEach((sc, n) => {
      for (let j = 0; j < STROKES; j += 1) {
        const due = sc.start + (SCRIBBLE * (j + 1)) / STROKES;
        if (due <= from || due > tau) continue;
        let run: Pt[] = [];
        const lay = () => {
          if (run.length > 1) paintStroke(g, run, { width: 5.6, colour: pal.paints[sc.paint], seed: n * 11 + j, streak: 0.12, dry: 0.22 });
          run = [];
        };
        // The segments along this stroke: STEPS points, so one fewer segments.
        for (let i = j * STEPS; i < (j + 1) * STEPS - 1; i += 1) {
          if (sc.mine[i]) {
            if (!run.length) run.push(sc.pts[i]);
            run.push(sc.pts[i + 1]);
          } else lay();
        }
        lay();
      }
    });
    g.restore();
  }

  function paint(c: Drawn, tau: number) {
    colour(c, tau);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.drawImage(layer, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // The coastline.
    for (const l of c.lines) stroke(ctx, l.line, easeOut(span(tau, l.from, l.to)), graphite, 1);

    // The lines to its neighbours, dashed, where they cross its land.
    const b = span(tau, ...WHEN.borders);
    if (b > 0) {
      ctx.save();
      clipToContinent(ctx, c);
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = pal.graphite;
      ctx.globalAlpha = 0.7 * b;
      ctx.lineWidth = 2.4;
      for (const line of c.borders) {
        ctx.beginPath();
        line.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
    }

    // The name, in handwriting, at the top.
    const n = span(tau, ...WHEN.name);
    if (n > 0) {
      ctx.globalAlpha = n;
      ctx.fillStyle = pal.graphite;
      ctx.font = `${Math.round(Math.min(44, w * 0.085))}px ${pal.hand}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(c.name, w * 0.07, h * 0.12);
      ctx.globalAlpha = 1;
    }

    // The scale bar, under it all.
    const sc = span(tau, ...WHEN.scale);
    if (sc > 0) {
      const x = w * 0.07;
      const y = h * 0.93;
      const bar = prepare(
        [
          { x, y: y - 6 },
          { x, y },
          { x: x + c.scale.px, y },
          { x: x + c.scale.px, y: y - 6 },
        ],
        { seed: 91, width: 1.4, jitter: 0.4, overshoot: 1, passes: 2 },
      );
      stroke(ctx, bar, easeOut(sc), graphite, 0.9);
      ctx.globalAlpha = clamp01(sc * 2 - 1);
      ctx.fillStyle = pal.graphite;
      ctx.font = `${Math.round(Math.min(24, w * 0.05))}px ${pal.hand}`;
      ctx.textBaseline = 'middle';
      ctx.fillText(`${c.scale.km.toLocaleString('en-GB')} km`, x + c.scale.px + 10, y - 3);
      ctx.globalAlpha = 1;
    }
  }

  return {
    resize(nw: number, nh: number, ndpr: number) {
      w = nw;
      h = nh;
      dpr = ndpr;
      canvas.width = layer.width = Math.max(1, Math.round(w * dpr));
      canvas.height = layer.height = Math.max(1, Math.round(h * dpr));
      if (current) current = prepareContinent(current.id, current.name);
      colouredTo = -1;
      leaving = null;
    },
    /** Starts sketching continent `id`, called `name` — or, with `finished`, shows it done. */
    show(id: ContinentId, name: string, now: number, finished: boolean) {
      if (current && !finished) {
        const image = document.createElement('canvas');
        image.width = canvas.width;
        image.height = canvas.height;
        image.getContext('2d')!.drawImage(canvas, 0, 0);
        leaving = { image, at: now };
      }
      current = prepareContinent(id, name);
      layer.getContext('2d')!.clearRect(0, 0, layer.width, layer.height);
      colouredTo = -1;
      started = now;
      still = finished;
    },
    /** Draws the sketch as it stands at `now` (seconds); says whether anything is still moving. */
    draw(now: number): boolean {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!current) return false;
      const tau = still ? 99 : now - started;
      if (leaving) {
        const u = (now - leaving.at) / FADE;
        if (u >= 1) leaving = null;
        else {
          ctx.globalAlpha = 1 - u;
          ctx.drawImage(leaving.image, 0, 0);
          ctx.globalAlpha = 1;
        }
      }
      paint(current, tau);
      return leaving !== null || tau < WHEN.scale[1];
    },
  };
}

export type ContinentSketch = ReturnType<typeof createContinentSketch>;

