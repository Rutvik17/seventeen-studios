/**
 * Generative poster geometry.
 *
 * The studio has no photography and no client screenshots, so every piece of
 * artwork on the site is drawn from the content itself: a seed plus a family
 * name produces a deterministic set of SVG primitives. The same brief always
 * renders the same poster, on the server and in the browser.
 */

import { mulberry32, range, intRange, type Rng } from './random';

export type PosterFamily = 'flow' | 'grid' | 'orbit' | 'strata' | 'bloom';

/** Normalised drawing space — the renderer scales this to any box. */
export const VIEW = 100;

export interface PosterShape {
  kind: 'path' | 'circle' | 'rect' | 'line';
  d?: string;
  cx?: number;
  cy?: number;
  r?: number;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  /** 0 = line colour, 1 = foreground, 2 = accent. */
  tone: 0 | 1 | 2;
  fill: boolean;
  width: number;
  /** Per-shape animation offset so reveals can stagger deterministically. */
  offset: number;
}

function flow(rng: Rng): PosterShape[] {
  const shapes: PosterShape[] = [];
  const lines = intRange(rng, 16, 24);
  const accentIndex = intRange(rng, 0, lines - 1);

  for (let i = 0; i < lines; i += 1) {
    const y = (i / (lines - 1)) * 78 + 11;
    const amp = range(rng, 3, 13);
    const phase = range(rng, 0, Math.PI * 2);
    const freq = range(rng, 1.2, 2.6);
    const steps = 26;
    let d = '';
    for (let s = 0; s <= steps; s += 1) {
      const t = s / steps;
      const x = 8 + t * 84;
      const wobble =
        Math.sin(t * Math.PI * freq + phase) * amp * Math.sin(t * Math.PI);
      d += `${s === 0 ? 'M' : 'L'}${x.toFixed(2)},${(y + wobble).toFixed(2)}`;
    }
    shapes.push({
      kind: 'path',
      d,
      tone: i === accentIndex ? 2 : 0,
      fill: false,
      width: i === accentIndex ? 1.6 : 0.85,
      offset: i / lines,
    });
  }
  return shapes;
}

function grid(rng: Rng): PosterShape[] {
  const shapes: PosterShape[] = [];
  const cols = intRange(rng, 5, 7);
  const cell = 80 / cols;
  for (let x = 0; x < cols; x += 1) {
    for (let y = 0; y < cols; y += 1) {
      const roll = rng();
      const px = 10 + x * cell;
      const py = 10 + y * cell;
      const inset = cell * 0.14;
      if (roll > 0.86) {
        shapes.push({
          kind: 'rect',
          x: px + inset,
          y: py + inset,
          w: cell - inset * 2,
          h: cell - inset * 2,
          tone: 2,
          fill: true,
          width: 0,
          offset: (x + y) / (cols * 2),
        });
      } else if (roll > 0.62) {
        shapes.push({
          kind: 'circle',
          cx: px + cell / 2,
          cy: py + cell / 2,
          r: cell * range(rng, 0.16, 0.32),
          tone: 1,
          fill: false,
          width: 0.9,
          offset: (x + y) / (cols * 2),
        });
      } else if (roll > 0.34) {
        shapes.push({
          kind: 'line',
          x1: px + inset,
          y1: py + inset,
          x2: px + cell - inset,
          y2: py + cell - inset,
          tone: 0,
          fill: false,
          width: 0.85,
          offset: (x + y) / (cols * 2),
        });
      } else {
        shapes.push({
          kind: 'rect',
          x: px + inset,
          y: py + inset,
          w: cell - inset * 2,
          h: cell - inset * 2,
          tone: 0,
          fill: false,
          width: 0.75,
          offset: (x + y) / (cols * 2),
        });
      }
    }
  }
  return shapes;
}

function orbit(rng: Rng): PosterShape[] {
  const shapes: PosterShape[] = [];
  const rings = intRange(rng, 5, 8);
  const cx = 50;
  const cy = 50;
  for (let i = 0; i < rings; i += 1) {
    const r = 8 + (i / rings) * 38;
    shapes.push({
      kind: 'circle',
      cx,
      cy,
      r,
      tone: 0,
      fill: false,
      width: 0.8,
      offset: i / rings,
    });
    const nodes = intRange(rng, 1, 3);
    for (let n = 0; n < nodes; n += 1) {
      const angle = range(rng, 0, Math.PI * 2);
      shapes.push({
        kind: 'circle',
        cx: cx + Math.cos(angle) * r,
        cy: cy + Math.sin(angle) * r,
        r: range(rng, 0.8, 2.2),
        tone: rng() > 0.55 ? 2 : 1,
        fill: true,
        width: 0,
        offset: i / rings + 0.05,
      });
    }
  }
  // A single chord cutting the system.
  const a = range(rng, 0, Math.PI * 2);
  shapes.push({
    kind: 'line',
    x1: cx + Math.cos(a) * 46,
    y1: cy + Math.sin(a) * 46,
    x2: cx - Math.cos(a) * 46,
    y2: cy - Math.sin(a) * 46,
    tone: 2,
    fill: false,
    width: 1.5,
    offset: 0.9,
  });
  return shapes;
}

function strata(rng: Rng): PosterShape[] {
  const shapes: PosterShape[] = [];
  const bands = intRange(rng, 11, 17);
  let y = 10;
  for (let i = 0; i < bands && y < 88; i += 1) {
    const h = range(rng, 1.4, 5.2);
    const indent = range(rng, 0, 18);
    const accent = rng() > 0.88;
    shapes.push({
      kind: 'rect',
      x: 10 + indent,
      y,
      w: 80 - indent - range(rng, 0, 14),
      h,
      tone: accent ? 2 : 0,
      fill: accent || rng() > 0.84,
      width: 0.8,
      offset: i / bands,
    });
    // Hairline tick marks in the margin.
    if (rng() > 0.5) {
      shapes.push({
        kind: 'line',
        x1: 5,
        y1: y + h / 2,
        x2: 8.5,
        y2: y + h / 2,
        tone: 1,
        fill: false,
        width: 0.8,
        offset: i / bands,
      });
    }
    y += h + range(rng, 1.5, 4.5);
  }
  return shapes;
}

function bloom(rng: Rng): PosterShape[] {
  const shapes: PosterShape[] = [];
  const arms = intRange(rng, 7, 12);
  const cx = 50;
  const cy = 52;
  for (let a = 0; a < arms; a += 1) {
    const base = (a / arms) * Math.PI * 2 + range(rng, -0.08, 0.08);
    const points = intRange(rng, 8, 14);
    let d = '';
    for (let p = 0; p <= points; p += 1) {
      const t = p / points;
      const r = t * range(rng, 26, 42);
      const angle = base + Math.sin(t * Math.PI) * range(rng, -0.4, 0.4);
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r * 0.86;
      d += `${p === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
      if (p === points) {
        shapes.push({
          kind: 'circle',
          cx: x,
          cy: y,
          r: range(rng, 0.7, 1.9),
          tone: a % 3 === 0 ? 2 : 1,
          fill: true,
          width: 0,
          offset: a / arms + 0.1,
        });
      }
    }
    shapes.push({
      kind: 'path',
      d,
      tone: a % 3 === 0 ? 2 : 0,
      fill: false,
      width: 0.85,
      offset: a / arms,
    });
  }
  shapes.push({
    kind: 'circle',
    cx,
    cy,
    r: range(rng, 2.5, 5),
    tone: 2,
    fill: false,
    width: 1.4,
    offset: 0,
  });
  return shapes;
}

const FAMILIES: Record<PosterFamily, (rng: Rng) => PosterShape[]> = {
  flow,
  grid,
  orbit,
  strata,
  bloom,
};

export function buildPoster(
  family: PosterFamily,
  seed: number,
): PosterShape[] {
  return FAMILIES[family](mulberry32(seed));
}
