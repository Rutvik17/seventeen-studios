/**
 * Skylines, drawn in pencil: the world's cities, one after another, on the
 * cover beside the title. Each city is drawn the way a sketcher draws one —
 * its landmarks first, by the shapes they are known by; then the streets
 * around them in plainer blocks, lighter; then windows and shading last.
 *
 * Everything is in drawing units, with the ground at y = 0 and up negative. A
 * city stands at most `TALLEST` units high and is as wide as it is asked to
 * be: the landmarks are placed along that width and the streets fill in the
 * rest, so the drawing fits whatever room the cover has beside the title.
 */

import { rng, smooth, type Pt } from '@/lib/sketchbook/geometry';

/** The tallest any city stands, in drawing units. */
export const TALLEST = 480;

/** 0: the landmarks' outlines; 1: the streets around them; 2: windows and shading. */
export type Phase = 0 | 1 | 2;

/**
 * Which of a city's three coloured pencils a mark is drawn with: 0 its
 * landmarks, 1 its streets, 2 the shading and the water.
 */
export type Tone = 0 | 1 | 2;

/** One mark of the drawing: one or more lines put down in one go. */
export type Mark = { paths: Pt[][]; weight: number; alpha: number; phase: Phase; tone: Tone };

export type CityId = 'toronto' | 'new-york' | 'london' | 'paris' | 'dubai' | 'tokyo' | 'sydney';

const P = (x: number, y: number): Pt => ({ x, y });

/** A polyline with a point every few units, so the pencil's wobble has somewhere to go. */
function dense(pts: Pt[], step = 6): Pt[] {
  const out: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length; i += 1) {
    const a = pts[i - 1];
    const b = pts[i];
    const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let k = 1; k <= n; k += 1) out.push(P(a.x + ((b.x - a.x) * k) / n, a.y + ((b.y - a.y) * k) / n));
  }
  return out;
}

/** Points round an ellipse from angle `a0` to `a1` (radians; 0 is to the right, up is negative). */
function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 32): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i += 1) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push(P(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry));
  }
  return out;
}

/** Parallel lines across a polygon at `angle`, `gap` apart — shading. */
function hatch(poly: Pt[], angle: number, gap: number): Pt[][] {
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const nx = -uy;
  const ny = ux;
  const ds = poly.map((p) => p.x * nx + p.y * ny);
  const lo = Math.min(...ds);
  const hi = Math.max(...ds);
  const out: Pt[][] = [];
  for (let d = lo + gap / 2; d < hi; d += gap) {
    const ts: number[] = [];
    for (let i = 0; i < poly.length; i += 1) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const da = a.x * nx + a.y * ny - d;
      const db = b.x * nx + b.y * ny - d;
      if (da < 0 !== db < 0) {
        const u = da / (da - db);
        ts.push((a.x + (b.x - a.x) * u) * ux + (a.y + (b.y - a.y) * u) * uy);
      }
    }
    ts.sort((a, b) => a - b);
    for (let k = 0; k + 1 < ts.length; k += 2) {
      out.push([P(nx * d + ux * ts[k], ny * d + uy * ts[k]), P(nx * d + ux * ts[k + 1], ny * d + uy * ts[k + 1])]);
    }
  }
  return out;
}

/** A zigzag between two rails, `x = left(y)` and `x = right(y)`, from `y0` up to `y1` — a lattice. */
function lattice(left: (y: number) => number, right: (y: number) => number, y0: number, y1: number, step: number): Pt[] {
  const out: Pt[] = [];
  let k = 0;
  for (let y = y0; y >= y1; y -= step, k += 1) out.push(P(k % 2 ? right(y) : left(y), y));
  return out;
}

class Drawing {
  marks: Mark[] = [];
  /** The pencil in hand: the landmarks', until the streets are drawn. */
  tone: Tone = 0;
  constructor(readonly rand: () => number) {}

  /** A landmark's line: firm and dark. */
  hero(pts: Pt[], weight = 1.7) {
    this.marks.push({ paths: [dense(pts)], weight: weight * 1.3, alpha: 1, phase: 0, tone: 0 });
  }
  /** A landmark's secondary line: lighter, drawn with its outline. */
  trim(pts: Pt[], alpha = 0.6) {
    this.marks.push({ paths: [dense(pts)], weight: 1.4, alpha: Math.min(1, alpha + 0.2), phase: 0, tone: 0 });
  }
  /** Something far off, drawn first and lightly, in the third pencil. */
  far(pts: Pt[]) {
    this.marks.push({ paths: [dense(pts)], weight: 1.4, alpha: 0.75, phase: 0, tone: 2 });
  }
  /** The streets: lighter blocks behind the landmarks. */
  street(pts: Pt[]) {
    this.marks.push({ paths: [dense(pts)], weight: 1.6, alpha: 0.9, phase: 1, tone: 1 });
  }
  /** Windows and details: a bundle of short lines, faint, in the pencil in hand. */
  detail(paths: Pt[][], alpha = 0.42, weight = 0.85, tone: Tone = this.tone) {
    if (paths.length) this.marks.push({ paths: paths.map((p) => dense(p, 8)), weight: weight * 1.3, alpha: Math.min(1, alpha * 1.45), phase: 2, tone });
  }

  /** Floors, as faint lines across a block from `top` down to the ground. */
  floors(x: number, w: number, top: number, every: number) {
    const lines: Pt[][] = [];
    for (let y = top + every; y < -6; y += every) lines.push([P(x + 3, y), P(x + w - 3, y)]);
    this.detail(lines, 0.3, 0.7);
  }
  /** Windows, as a grid of short strokes. */
  windows(x: number, w: number, top: number, rows: number, cols: number) {
    const lines: Pt[][] = [];
    const cw = (w - 8) / cols;
    const rh = (-top - 16) / rows;
    for (let r = 0; r < rows; r += 1) {
      const y = top + 10 + r * rh;
      for (let c = 0; c < cols; c += 1) {
        const cx = x + 4 + c * cw + cw / 2;
        lines.push([P(cx, y), P(cx, y + Math.min(7, rh * 0.55))]);
      }
    }
    this.detail(lines, 0.38, 0.8);
  }
  /** Shading down the right-hand side of a block, where the light does not reach. */
  shade(poly: Pt[], gap = 5, alpha = 0.35) {
    this.detail(hatch(poly, -1.05, gap), alpha + 0.1, 0.75, 2);
  }

  /**
   * The streets: blocks along the ground from 0 to `width`, stepping round the
   * spans in `keep` where the landmarks stand. Each block gets a roof of some
   * kind, and floors, windows or shading.
   */
  streets(width: number, keep: [number, number][], low: number, high: number, extras: (x: number, w: number, h: number) => void = () => undefined) {
    const { rand } = this;
    const held = this.tone;
    this.tone = 1;
    let x = -6 + rand() * 10;
    while (x < width) {
      const w = 26 + rand() * 42;
      const blocked = keep.find(([a, b]) => x < b && x + w > a);
      if (blocked) {
        x = blocked[1] + 3 + rand() * 6;
        continue;
      }
      const h = low + rand() * (high - low);
      const roof = rand();
      if (roof < 0.22) {
        // A setback: a smaller block on top.
        const iw = w * (0.45 + rand() * 0.2);
        const ix = x + (w - iw) / 2;
        const ih = 12 + rand() * 22;
        this.street([P(x, 0), P(x, -h), P(ix, -h), P(ix, -h - ih), P(ix + iw, -h - ih), P(ix + iw, -h), P(x + w, -h), P(x + w, 0)]);
      } else if (roof < 0.36) {
        // A pitched roof, off to one side.
        this.street([P(x, 0), P(x, -h), P(x + w, -h - 10 - rand() * 10), P(x + w, 0)]);
      } else {
        this.street([P(x, 0), P(x, -h), P(x + w, -h), P(x + w, 0)]);
        if (roof > 0.84) this.trim([P(x + w * 0.62, -h), P(x + w * 0.62, -h - 18 - rand() * 26)], 0.45);
      }
      const inside = rand();
      if (inside < 0.35) this.windows(x, w, -h, Math.max(2, Math.round(h / 26)), Math.max(2, Math.round(w / 12)));
      else if (inside < 0.62) this.floors(x, w, -h, 11 + rand() * 6);
      if (rand() < 0.45) this.shade([P(x + w * 0.66, 0), P(x + w * 0.66, -h), P(x + w, -h), P(x + w, 0)]);
      extras(x, w, h);
      x += w + 2 + rand() * 7;
    }
    this.tone = held;
  }
}

/* ------------------------------------------------------------------ *
 * Landmarks
 * ------------------------------------------------------------------ */

/** Toronto's CN Tower: three legs into one shaft, the pod, the SkyPod, the mast. */
function cnTower(g: Drawing, x: number) {
  g.hero(smooth([P(x - 22, 0), P(x - 14, -110), P(x - 9, -210), P(x - 7, -288)], 6));
  g.hero(smooth([P(x + 22, 0), P(x + 14, -110), P(x + 9, -210), P(x + 7, -288)], 6));
  g.trim([P(x, 0), P(x, -288)], 0.4);
  g.hero([P(x - 7, -288), P(x - 25, -300), P(x - 28, -315), P(x - 22, -326), P(x - 8, -332), P(x + 8, -332), P(x + 22, -326), P(x + 28, -315), P(x + 25, -300), P(x + 7, -288)]);
  g.trim([P(x - 27, -309), P(x + 27, -309)]);
  g.trim([P(x - 27, -318), P(x + 27, -318)]);
  g.hero([P(x - 6, -332), P(x - 5, -390)], 1.4);
  g.hero([P(x + 6, -332), P(x + 5, -390)], 1.4);
  g.hero([P(x - 10, -390), P(x - 10, -401), P(x + 10, -401), P(x + 10, -390), P(x - 10, -390)], 1.3);
  g.hero([P(x - 3, -401), P(x - 1.2, -472)], 1.1);
  g.hero([P(x + 3, -401), P(x + 1.2, -472)], 1.1);
  g.detail([-420, -440, -455].map((y) => [P(x - 3, y), P(x + 3, y)]), 0.6);
  g.shade([P(x + 2, 0), P(x + 2, -288), P(x + 8, -288), P(x + 21, 0)], 4, 0.3);
}

/** The Rogers Centre's dome, low and ribbed. */
function dome(g: Drawing, x: number, w: number) {
  g.hero([P(x - w / 2, 0), P(x - w / 2, -12), P(x + w / 2, -12), P(x + w / 2, 0)], 1.4);
  g.hero(arc(x, -12, w / 2 - 4, 42, Math.PI, Math.PI * 2), 1.5);
  g.detail([0.25, 0.5, 0.75].map((u) => arc(x, -12, (w / 2 - 4) * u, 42, Math.PI * 1.06, Math.PI * 1.94, 16)), 0.4);
}

/** The Empire State Building: setbacks, piers, the mast and the spire. */
function empireState(g: Drawing, x: number) {
  const steps: [number, number][] = [
    [55, -58],
    [36, -250],
    [28, -290],
    [21, -316],
    [15, -334],
  ];
  const left: Pt[] = [P(x - 55, 0)];
  for (let i = 0; i < steps.length; i += 1) {
    left.push(P(x - steps[i][0], steps[i][1]));
    if (i + 1 < steps.length) left.push(P(x - steps[i + 1][0], steps[i][1]));
  }
  const right = left.map((p) => P(2 * x - p.x, p.y)).reverse();
  g.hero([...left, P(x - 10, -334), P(x - 6, -382), P(x + 6, -382), P(x + 10, -334), ...right]);
  g.hero([P(x, -382), P(x, -446)], 1.2);
  g.detail([-24, -12, 0, 12, 24].map((dx) => [P(x + dx, -62), P(x + dx, -246)]), 0.4);
  g.shade([P(x + 14, -58), P(x + 14, -250), P(x + 36, -250), P(x + 36, -58)], 4.5, 0.32);
}

/** The Chrysler Building: its terraced crown of arches, and the needle. */
function chrysler(g: Drawing, x: number) {
  const top = -236;
  g.hero([P(x - 28, 0), P(x - 28, top), P(x + 28, top), P(x + 28, 0)]);
  for (let i = 0; i < 5; i += 1) {
    const r = 27 - i * 5;
    g.hero(arc(x, top - i * 12, r, r * 1.15, Math.PI, Math.PI * 2, 20), 1.3);
    g.detail(
      [-0.7, -0.35, 0, 0.35, 0.7].map((u) => {
        const a = -Math.PI / 2 + u;
        return [P(x + Math.cos(a) * r * 0.55, top - i * 12 + Math.sin(a) * r * 0.62), P(x + Math.cos(a) * r * 0.85, top - i * 12 + Math.sin(a) * r * 0.98)];
      }),
      0.45,
    );
  }
  g.hero([P(x - 3, top - 70), P(x, -350), P(x + 3, top - 70)], 1.2);
  g.windows(x - 28, 56, top, 9, 4);
}

/** One World Trade Center: a square base, the tapering faces that cross, the mast. */
function oneWorldTrade(g: Drawing, x: number) {
  g.hero([P(x - 32, 0), P(x - 32, -46), P(x - 18, -404), P(x + 18, -404), P(x + 32, -46), P(x + 32, 0)]);
  g.trim([P(x - 32, -46), P(x + 32, -46)]);
  g.trim([P(x - 32, -46), P(x + 18, -404)], 0.5);
  g.trim([P(x + 32, -46), P(x - 18, -404)], 0.5);
  g.hero([P(x - 14, -410), P(x + 14, -410)], 1.2);
  g.hero([P(x, -410), P(x, -478)], 1.1);
  g.shade([P(x, -225), P(x + 32, -46), P(x + 18, -404)], 4, 0.28);
}

/** A New York water tower on a roof: the tank on its legs, and its cone. */
function waterTower(g: Drawing, x: number, roof: number) {
  g.detail(
    [
      [P(x - 5, roof), P(x - 5, roof - 8)],
      [P(x + 5, roof), P(x + 5, roof - 8)],
      [P(x - 7, roof - 8), P(x - 7, roof - 20), P(x + 7, roof - 20), P(x + 7, roof - 8), P(x - 7, roof - 8)],
      [P(x - 8, roof - 20), P(x, roof - 28), P(x + 8, roof - 20)],
    ],
    0.6,
    1,
  );
}

/** The Elizabeth Tower — Big Ben: shaft, clock, belfry, and the spire. */
function bigBen(g: Drawing, x: number) {
  g.hero([P(x - 16, 0), P(x - 16, -196), P(x - 20, -200), P(x - 20, -250), P(x - 17, -254), P(x - 17, -276), P(x + 17, -276), P(x + 17, -254), P(x + 20, -250), P(x + 20, -200), P(x + 16, -196), P(x + 16, 0)]);
  g.hero(arc(x, -225, 13, 13, 0, Math.PI * 2, 36), 1.4);
  g.trim([P(x, -225), P(x + 1, -234)], 0.8);
  g.trim([P(x, -225), P(x + 7, -222)], 0.8);
  g.hero([P(x - 19, -276), P(x, -346), P(x + 19, -276)]);
  g.trim([P(x, -346), P(x, -362)], 0.8);
  g.detail([-12, 12].map((dx) => [P(x + dx, -276), P(x + dx * 1.1, -292)]), 0.6);
  g.detail([-9, 0, 9].map((dx) => arc(x + dx, -262, 3, 5, Math.PI, Math.PI * 2, 6).concat([P(x + dx + 3, -256)])), 0.55);
  g.detail([-8, 0, 8].map((dx) => [P(x + dx, -10), P(x + dx, -190)]), 0.35);
  g.shade([P(x + 4, 0), P(x + 4, -196), P(x + 16, -196), P(x + 16, 0)], 4, 0.3);
}

/** The Palace of Westminster: a long front with pinnacles, and the Victoria Tower at its end. */
function westminster(g: Drawing, x0: number, x1: number) {
  const vx = x0 + 22;
  g.hero([P(x0, 0), P(x0, -160), P(x0 + 44, -160), P(x0 + 44, 0)], 1.5);
  g.detail([0, 14.7, 29.3, 44].map((dx) => [P(x0 + dx, -160), P(x0 + dx, -174)]), 0.6);
  g.trim([P(x0 + 44, -66), P(x1, -66)]);
  g.trim([P(x1, -66), P(x1, 0)]);
  const spikes: Pt[][] = [];
  for (let x = x0 + 56; x < x1 - 4; x += 15) spikes.push([P(x, -66), P(x, -80)]);
  g.detail(spikes, 0.55);
  g.windows(x0 + 44, x1 - x0 - 44, -66, 3, Math.round((x1 - x0 - 44) / 11));
  g.windows(vx - 22, 44, -160, 7, 3);
}

/** The London Eye: the rim, the spokes, the capsules, and the legs that hold it. */
function londonEye(g: Drawing, x: number, r: number) {
  const cy = -(r + 14);
  g.hero(arc(x, cy, r, r, -Math.PI / 2, Math.PI * 1.5, 90), 1.6);
  g.trim(arc(x, cy, r - 7, r - 7, -Math.PI / 2, Math.PI * 1.5, 80), 0.45);
  g.detail(
    Array.from({ length: 18 }, (_, i) => {
      const a = (i / 18) * Math.PI * 2;
      return [P(x, cy), P(x + Math.cos(a) * (r - 7), cy + Math.sin(a) * (r - 7))];
    }),
    0.35,
    0.7,
  );
  g.detail(
    Array.from({ length: 32 }, (_, i) => {
      const a = (i / 32) * Math.PI * 2;
      return arc(x + Math.cos(a) * (r + 5), cy + Math.sin(a) * (r + 5), 3.2, 4, 0, Math.PI * 2, 8);
    }),
    0.55,
    0.8,
  );
  g.hero([P(x - r * 0.62, 0), P(x, cy)], 1.5);
  g.hero([P(x - r * 0.28, 0), P(x, cy)], 1.5);
  g.trim(arc(x, cy, 5, 5, 0, Math.PI * 2, 10), 0.8);
}

/** The Shard: a split pyramid of glass. */
function shard(g: Drawing, x: number) {
  g.hero([P(x - 36, 0), P(x - 5, -366), P(x - 9, -390)]);
  g.hero([P(x + 36, 0), P(x + 7, -376), P(x + 11, -396)]);
  g.trim([P(x - 6, 0), P(x + 1, -380)], 0.5);
  g.detail([-352, -372].map((y) => [P(x - 5 + (y + 352) * 0.1, y), P(x + 7, y - 4)]), 0.5);
  g.shade([P(x + 1, -380), P(x - 6, 0), P(x + 36, 0), P(x + 7, -376)], 4.5, 0.3);
}

/** The Eiffel Tower: four curved legs, the arch, three platforms, the lattice, the mast. */
function eiffel(g: Drawing, x: number) {
  const outer = (y: number) => 110 * Math.pow(1 - -y / 400, 2.1) + 7 * (-y / 400);
  const leg = (s: -1 | 1) => {
    const pts: Pt[] = [];
    for (let y = 0; y >= -400; y -= 10) pts.push(P(x + s * outer(y), y));
    return pts;
  };
  g.hero(leg(-1), 1.8);
  g.hero(leg(1), 1.8);
  // The arch between the legs.
  g.hero(arc(x, 0, 68, 78, Math.PI, Math.PI * 2, 30), 1.4);
  // The platforms.
  const deck = (y: number, w: number, h: number) => g.hero([P(x - w, y), P(x + w, y), P(x + w, y - h), P(x - w, y - h), P(x - w, y)], 1.4);
  deck(-116, outer(-116) + 8, 12);
  deck(-226, outer(-226) + 6, 9);
  deck(-396, 10, 12);
  g.hero([P(x, -408), P(x, -444)], 1.1);
  // The inner edges of the legs, and the lattice between them and the outer.
  const inner1 = (y: number) => 68 - (-y / 116) * (68 - (outer(-116) - 20));
  const inner2 = (y: number) => outer(-128) - 22 - ((-y - 128) / 98) * (outer(-128) - 22 - (outer(-226) - 12));
  for (const s of [-1, 1] as const) {
    g.trim([P(x + s * 68, -60), P(x + s * (outer(-116) - 20), -116)], 0.55);
    g.trim([P(x + s * (outer(-128) - 22), -128), P(x + s * (outer(-226) - 12), -226)], 0.55);
    g.detail(
      [
        lattice((y) => x + s * outer(y), (y) => x + s * (y > -60 ? outer(y) - 14 : inner1(y)), -4, -112, 9).map((p) => p),
        lattice((y) => x + s * outer(y), (y) => x + s * inner2(y), -130, -222, 9),
        lattice((y) => x + s * outer(y), (y) => x + s * Math.max(1, outer(y) - 6), -236, -392, 10),
      ],
      0.45,
      0.75,
    );
  }
}

/** A Paris block: stone front, a mansard roof with chimneys, windows in rows. */
function haussmann(g: Drawing, x: number, w: number, h: number) {
  const held = g.tone;
  g.tone = 1;
  g.street([P(x, 0), P(x, -h), P(x + 6, -h - 20), P(x + w - 6, -h - 20), P(x + w, -h), P(x + w, 0)]);
  g.detail(
    [
      [P(x, -h), P(x + w, -h)],
      [P(x + 1, -h + 26), P(x + w - 1, -h + 26)],
      ...[0.3, 0.7].map((u) => [P(x + w * u - 3, -h - 20), P(x + w * u - 3, -h - 30), P(x + w * u + 3, -h - 30), P(x + w * u + 3, -h - 20)]),
    ],
    0.5,
    0.9,
  );
  g.windows(x, w, -h + 2, Math.max(2, Math.round(h / 24)), Math.max(2, Math.round(w / 13)));
  g.tone = held;
}

/** The Burj Khalifa: setbacks spiralling up, a spine, and the spire. */
function burjKhalifa(g: Drawing, x: number) {
  const leftSteps: [number, number][] = [
    [46, -62],
    [37, -132],
    [29, -196],
    [22, -252],
    [16, -300],
    [11, -344],
    [7, -382],
  ];
  const rightSteps: [number, number][] = [
    [44, -84],
    [35, -160],
    [27, -222],
    [20, -274],
    [14, -322],
    [9, -362],
    [6, -390],
  ];
  const side = (steps: [number, number][], s: -1 | 1) => {
    const pts: Pt[] = [P(x + s * (steps[0][0] + 2), 0)];
    for (let i = 0; i < steps.length; i += 1) {
      pts.push(P(x + s * steps[i][0], steps[i][1]));
      if (i + 1 < steps.length) pts.push(P(x + s * steps[i + 1][0], steps[i][1]));
    }
    pts.push(P(x + s * 2.5, -420), P(x + s * 0.8, -480));
    return pts;
  };
  g.hero(side(leftSteps, -1));
  g.hero(side(rightSteps, 1));
  g.trim([P(x, 0), P(x, -400)], 0.4);
  g.detail(
    [...leftSteps, ...rightSteps].map(([w, y], i) => (i < leftSteps.length ? [P(x - w, y), P(x, y - 4)] : [P(x, y - 4), P(x + w, y)])),
    0.4,
  );
  g.shade([P(x, 0), P(x, -392), P(x + 6, -390), P(x + 20, -274), P(x + 35, -160), P(x + 46, 0)], 5, 0.26);
}

/** The Burj Al Arab: the sail, its mast, and the helipad out to one side. */
function burjAlArab(g: Drawing, x: number) {
  g.hero([P(x, 0), P(x, -236)], 1.6);
  g.hero(smooth([P(x, -4), P(x + 50, -22), P(x + 68, -80), P(x + 62, -150), P(x + 38, -200), P(x + 4, -228)], 8));
  g.detail([-40, -80, -120, -160, -196].map((y) => [P(x, y), P(x + 60 * Math.sin(((-y + 4) / 232) * Math.PI) + 6, y + 8)]), 0.4);
  g.hero([P(x, -168), P(x - 30, -170)], 1.2);
  g.trim(arc(x - 36, -172, 12, 3.5, 0, Math.PI * 2, 16), 0.7);
}

/** The Tokyo Skytree: a tapering lattice with two decks, and the antenna. */
function skytree(g: Drawing, x: number) {
  const half = (y: number) => 28 - (-y / 290) * 21;
  g.hero([P(x - 28, 0), P(x - 7, -290)]);
  g.hero([P(x + 28, 0), P(x + 7, -290)]);
  g.detail([lattice((y) => x - half(y), (y) => x + half(y), -6, -284, 14)], 0.4, 0.75);
  g.hero([P(x - 7, -290), P(x - 17, -296), P(x - 17, -312), P(x - 7, -318), P(x + 7, -318), P(x + 17, -312), P(x + 17, -296), P(x + 7, -290)], 1.5);
  g.hero([P(x - 6, -318), P(x - 5, -382)], 1.3);
  g.hero([P(x + 6, -318), P(x + 5, -382)], 1.3);
  g.hero([P(x - 11, -382), P(x - 11, -392), P(x + 11, -392), P(x + 11, -382), P(x - 11, -382)], 1.3);
  g.hero([P(x - 3, -392), P(x - 1, -478)], 1.1);
  g.hero([P(x + 3, -392), P(x + 1, -478)], 1.1);
}

/** Tokyo Tower: the Eiffel's shape, squarer, with its two decks. */
function tokyoTower(g: Drawing, x: number) {
  const outer = (y: number) => 60 * Math.pow(1 - -y / 250, 1.7) + 4;
  for (const s of [-1, 1] as const) {
    const pts: Pt[] = [];
    for (let y = 0; y >= -250; y -= 10) pts.push(P(x + s * outer(y), y));
    g.hero(pts, 1.5);
    g.detail([lattice((y) => x + s * outer(y), (y) => x + s * Math.max(2, outer(y) - 11), -4, -240, 9)], 0.42, 0.75);
  }
  g.hero(arc(x, 0, 34, 40, Math.PI, Math.PI * 2, 20), 1.2);
  g.hero([P(x - outer(-96) - 6, -96), P(x + outer(-96) + 6, -96), P(x + outer(-96) + 6, -108), P(x - outer(-96) - 6, -108), P(x - outer(-96) - 6, -96)], 1.3);
  g.hero([P(x - 9, -196), P(x + 9, -196), P(x + 9, -204), P(x - 9, -204), P(x - 9, -196)], 1.2);
  g.hero([P(x, -250), P(x, -300)], 1.1);
}

/**
 * Mount Fuji, far off behind the city, in the third pencil: only what rises
 * above the roofs — the upper slopes from `hidden` up, the flat summit, the
 * snow — so no line of it runs through anything in front.
 */
function fuji(g: Drawing, x: number, w: number, hidden: number) {
  const slope = (u: number) => [P(x - w / 2 + u * (w / 2 - 18), -176 * Math.pow(u, 0.8))];
  const side = (s: -1 | 1) => {
    const pts: Pt[] = [];
    for (let u = 0; u <= 1.0001; u += 0.05) {
      const [p] = slope(u);
      if (-p.y >= hidden) pts.push(P(s < 0 ? p.x : 2 * x - p.x, p.y));
    }
    return s < 0 ? pts : pts.reverse();
  };
  g.far(side(-1));
  g.far([P(x - 18, -176), P(x + 18, -176)]);
  g.far(side(1));
  const snow: Pt[] = [];
  for (let i = 0; i <= 8; i += 1) {
    const u = i / 8;
    snow.push(P(x - w * 0.1 + u * w * 0.2, -134 - (i % 2 ? 12 : 0) - Math.sin(u * Math.PI) * 8));
  }
  g.detail([snow], 0.5, 0.9, 2);
}

/** The Sydney Opera House: shells on a podium. */
function operaHouse(g: Drawing, x: number, w: number) {
  const base = -18;
  g.hero([P(x, 0), P(x, base), P(x + w, base), P(x + w, 0)], 1.4);
  g.detail([[P(x + 4, base + 8), P(x + w - 4, base + 8)]], 0.45);
  const shells: [number, number, number][] = [
    [0.02, 0.3, 118],
    [0.16, 0.26, 100],
    [0.3, 0.2, 72],
    [0.5, 0.26, 92],
    [0.63, 0.22, 76],
    [0.76, 0.16, 50],
  ];
  for (const [u, sw, h] of shells) {
    const x0 = x + w * u;
    const x1 = x0 + w * sw;
    const peak = P(x0 + w * sw * 0.78, base - h);
    g.hero(smooth([P(x0, base), P(x0 + w * sw * 0.3, base - h * 0.68), peak], 10), 1.5);
    g.hero([peak, P(x1, base)], 1.3);
    g.detail(hatch([P(x0 + w * sw * 0.5, base), peak, P(x1, base)], -1.3, 5), 0.3, 0.7);
  }
}

/** The Sydney Harbour Bridge: two pylons at each end, the arch, the deck, the hangers. */
function harbourBridge(g: Drawing, x0: number, x1: number) {
  const deck = -56;
  const span = x1 - x0;
  const archY = (x: number, lift: number) => deck + 18 - Math.sin(((x - x0) / span) * Math.PI) * lift;
  for (const px of [x0, x1]) {
    g.hero([P(px - 16, 0), P(px - 14, -96), P(px + 14, -96), P(px + 16, 0)], 1.5);
    g.detail([[P(px - 14, -80), P(px + 14, -80)], [P(px - 10, -96), P(px - 8, -104), P(px + 8, -104), P(px + 10, -96)]], 0.5, 0.9);
  }
  const top: Pt[] = [];
  const bottom: Pt[] = [];
  for (let x = x0; x <= x1; x += span / 40) {
    top.push(P(x, archY(x, 150)));
    bottom.push(P(x, archY(x, 122)));
  }
  g.hero(top, 1.6);
  g.hero(bottom, 1.4);
  g.hero([P(x0 - 40, deck), P(x1 + 40, deck)], 1.4);
  const truss: Pt[] = [];
  for (let k = 0, x = x0 + 6; x < x1 - 6; x += span / 28, k += 1) truss.push(P(x, k % 2 ? archY(x, 150) : archY(x, 122)));
  g.detail([truss], 0.45, 0.8);
  const hangers: Pt[][] = [];
  for (let x = x0 + span * 0.14; x < x1 - span * 0.12; x += span / 12) {
    const y = archY(x, 122);
    if (y < deck - 4) hangers.push([P(x, y), P(x, deck)]);
  }
  g.detail(hangers, 0.45, 0.8);
}

/** Sydney Tower: a thin shaft with its turret, and a spire. */
function sydneyTower(g: Drawing, x: number) {
  g.hero([P(x - 4, 0), P(x - 4, -250)], 1.4);
  g.hero([P(x + 4, 0), P(x + 4, -250)], 1.4);
  g.hero([P(x - 4, -250), P(x - 16, -256), P(x - 18, -278), P(x - 10, -290), P(x + 10, -290), P(x + 18, -278), P(x + 16, -256), P(x + 4, -250)], 1.4);
  g.trim([P(x - 17, -266), P(x + 17, -266)], 0.6);
  g.hero([P(x, -290), P(x, -326)], 1.1);
  g.detail(Array.from({ length: 10 }, (_, i) => [P(x - 4, -20 - i * 23), P(x + 4, -8 - i * 23)]), 0.35, 0.7);
}

/** Water: short level strokes just below the line. */
function water(g: Drawing, width: number) {
  const { rand } = g;
  g.detail(
    Array.from({ length: Math.round(width / 40) }, () => {
      const x = rand() * width;
      const y = 7 + rand() * 18;
      return [P(x, y), P(x + 14 + rand() * 30, y + (rand() - 0.5) * 1.5)];
    }),
    0.5,
    0.9,
    2,
  );
}

/* ------------------------------------------------------------------ *
 * Cities
 * ------------------------------------------------------------------ */

/**
 * Each city, drawn `width` units wide: its landmarks placed along that width,
 * and the streets filling in round them. Seeded, so a city is always drawn the
 * same way at the same width.
 */
const CITIES: Record<CityId, (g: Drawing, width: number) => void> = {
  toronto(g, W) {
    const cn = W * 0.56;
    cnTower(g, cn);
    dome(g, cn - 110, 150);
    g.streets(W, [[cn - 190, cn + 32]], 60, 170, () => undefined);
    const fcp = cn + 60;
    g.hero([P(fcp, 0), P(fcp, -236), P(fcp + 44, -236), P(fcp + 44, 0)], 1.5);
    g.detail([8, 16, 24, 32].map((dx) => [P(fcp + dx + 2, -230), P(fcp + dx + 2, -6)]), 0.35);
  },
  'new-york'(g, W) {
    const es = W * 0.5;
    empireState(g, es);
    chrysler(g, es - 120);
    oneWorldTrade(g, Math.min(W - 50, es + 150));
    g.streets(W, [[es - 152, es + 60], [Math.min(W - 50, es + 150) - 36, Math.min(W - 50, es + 150) + 36]], 70, 190, (x, w, h) => {
      if (g.rand() < 0.3) waterTower(g, x + w * 0.3, -h);
    });
  },
  london(g, W) {
    const bb = W * 0.3;
    bigBen(g, bb);
    westminster(g, Math.max(4, bb - 200), bb - 22);
    const eye = Math.min(W - 150, bb + 190);
    londonEye(g, eye, 118);
    const sh = Math.min(W - 40, eye + 170);
    if (sh - eye > 150) shard(g, sh);
    water(g, W);
    g.streets(W, [[Math.max(4, bb - 204), bb + 24], [eye - 128, eye + 124], [sh - 40, sh + 40]], 40, 110);
  },
  paris(g, W) {
    const e = W * 0.52;
    eiffel(g, e);
    const { rand } = g;
    for (const [from, to] of [
      [-4, e - 122],
      [e + 122, W + 4],
    ]) {
      let x = from;
      while (x < to - 30) {
        const w = Math.min(to - x, 44 + rand() * 30);
        if (w < 30) break;
        haussmann(g, x, w, 70 + rand() * 40);
        x += w + 3;
      }
    }
  },
  dubai(g, W) {
    const bk = W * 0.6;
    burjKhalifa(g, bk);
    const ba = W * 0.12;
    burjAlArab(g, ba);
    water(g, W * 0.3);
    g.streets(W, [[ba - 40, ba + 80], [bk - 52, bk + 52]], 70, 240);
  },
  tokyo(g, W) {
    const fw = Math.min(W * 0.5, 380);
    const fx = Math.max(fw * 0.42, W * 0.2);
    fuji(g, fx, fw, 96);
    const st = W * 0.74;
    skytree(g, st);
    const tt = W * 0.47;
    tokyoTower(g, tt);
    g.streets(W, [[tt - 66, tt + 66], [st - 32, st + 32]], 30, 88);
  },
  sydney(g, W) {
    harbourBridge(g, W * 0.06, W * 0.4);
    operaHouse(g, W * 0.5, Math.min(W * 0.34, 230));
    const tw = Math.min(W - 30, W * 0.5 + Math.min(W * 0.34, 230) + 50);
    sydneyTower(g, tw);
    water(g, W);
    g.streets(W, [[-10, W * 0.5 + Math.min(W * 0.34, 230) + 6], [tw - 22, tw + 22]], 60, 150);
  },
};

/**
 * Each city's three coloured pencils, from the paint box (`--paint-n`): its
 * landmarks, its streets, its shading and water. A few colours a city, and a
 * different few for the next, so the cover is colourful over time without ever
 * being a spectrum at once.
 */
export const PENCILS: Record<CityId, [number, number, number]> = {
  toronto: [4, 1, 1],
  'new-york': [1, 2, 2],
  london: [4, 1, 5],
  paris: [5, 1, 2],
  dubai: [2, 1, 1],
  tokyo: [4, 5, 1],
  sydney: [1, 2, 1],
};

const SEEDS: Record<CityId, number> = { toronto: 11, 'new-york': 23, london: 37, paris: 41, dubai: 53, tokyo: 67, sydney: 79 };

/** The marks for `city`, drawn `width` units wide, in the order they are put down. */
export function drawCity(city: CityId, width: number): Mark[] {
  const g = new Drawing(rng(SEEDS[city]));
  CITIES[city](g, width);
  // Landmarks first, then streets, then the finishing — each in the order drawn.
  return g.marks.map((m, i) => ({ m, i })).sort((a, b) => a.m.phase - b.m.phase || a.i - b.i).map(({ m }) => m);
}
