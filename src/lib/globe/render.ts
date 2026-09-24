/**
 * One frame of the globe: its soft shadow on the ground, the paint wrapped
 * onto the ball, the pencil over it, and the lamp's light on all of it.
 *
 * WRAPPING THE MAP ONTO THE BALL. For every pixel of the disc, the map's row
 * and column under it before any turn are worked out once for the drawing's
 * size (`view.ts` backwards), with how much light falls there and how far the
 * rim squeezes it. Because the globe only ever turns about its own axis, a
 * turn is a shift of the columns: each frame is one pass over the disc, a
 * look-up and a multiply per pixel.
 *
 * The pencil is drawn fresh each frame from the lines' latitudes and
 * longitudes, so it stays crisp at any size; lines round the back of the
 * globe are cut exactly at its rim.
 */

import { rng, type Pt } from '@/lib/sketchbook/geometry';
import { marks, type Line, type Marks } from './marks';
import { makeGround } from './ground';
import type { Sheet } from './sheet';
import { fromScreen, LAMP, TILT, toScreen } from './view';

const DEG = Math.PI / 180;

/** The drawing's colours, read off the page (`Globe.module.css`). */
export type GlobePalette = {
  paper: string;
  dusk: string;
  graphite: string;
  shadow: string;
  /** One per paint, in `PAINTS` order. */
  paints: string[];
};

export type Scene = {
  sheet: Sheet;
  marks: Marks;
  /** Sets the drawing's size: `w` × `h` CSS pixels at `dpr` device pixels each. */
  resize(w: number, h: number, dpr: number): void;
  /** Draws the globe turned `spin` degrees. */
  draw(spin: number): void;
  /** Where the globe is, in CSS pixels. */
  globe(): { cx: number; cy: number; r: number };
};

type Table = {
  size: number;
  /** Device-pixel corner of the disc's box on the canvas. */
  x0: number;
  y0: number;
  /** Per disc pixel: its place in the box, the map row and column under it before any turn, which copy of the map to read, the light, the warm glow, and how much of the pixel the disc covers. */
  index: Int32Array;
  row: Uint16Array;
  col: Uint16Array;
  level: Uint8Array;
  light: Uint8Array;
  warm: Uint8Array;
  edge: Uint8Array;
  image: ImageData;
  out: Uint32Array;
  canvas: HTMLCanvasElement;
};

/**
 * The globe, on two canvases: `back` holds the ground, drawn once for each
 * size, and `canvas` everything that moves, drawn over it every frame. The
 * paint is `sheet`, the world map already coloured (`sheet.ts`).
 */
export function createScene(back: HTMLCanvasElement, canvas: HTMLCanvasElement, pal: GlobePalette, sheet: Sheet): Scene {
  const ctx = canvas.getContext('2d')!;
  const all = marks();
  let w = 1;
  let h = 1;
  let dpr = 1;
  let table: Table | null = null;
  let parallels: Pt[][] = [];
  /** The pencil shading, kept as a picture rather than drawn stroke by stroke every frame. */
  let hatching: HTMLCanvasElement | null = null;

  const place = () => ({ cx: w * 0.5, cy: h * 0.5, r: Math.min(w, h) * 0.4 });

  function build() {
    back.width = canvas.width;
    back.height = canvas.height;
    back.getContext('2d')!.drawImage(makeGround(canvas.width, canvas.height, pal.paper, pal.dusk), 0, 0);
    hatching = null;
    const { cx, cy, r } = place();
    const R = r * dpr;
    const size = Math.ceil(2 * R) + 4;
    const x0 = Math.round(cx * dpr - size / 2);
    const y0 = Math.round(cy * dpr - size / 2);
    const W = sheet.width;
    const H = sheet.height;
    const detail = W / (2 * Math.PI * R);
    // Filled straight into arrays the size of the box, and cut to the disc after.
    const most = size * size;
    const index = new Int32Array(most);
    const row = new Uint16Array(most);
    const col = new Uint16Array(most);
    const level = new Uint8Array(most);
    const light = new Uint8Array(most);
    const warm = new Uint8Array(most);
    const edge = new Uint8Array(most);
    let n = 0;
    for (let py = 0; py < size; py += 1) {
      const sy = -(y0 + py + 0.5 - cy * dpr) / R;
      for (let px = 0; px < size; px += 1) {
        const sx = (x0 + px + 0.5 - cx * dpr) / R;
        const d = Math.sqrt(sx * sx + sy * sy);
        if (d > 1 + 1 / R) continue;
        const k = d > 1 ? 1 / d : 1;
        const f = fromScreen(sx * k, sy * k);
        if (!f) continue;
        index[n] = py * size + px;
        row[n] = Math.min(H - 1, Math.max(0, Math.floor(((90 - f.lat) / 180) * H)));
        col[n] = Math.floor((((((f.lon0 + 180) % 360) + 360) % 360) / 360) * W) % W;
        // How squeezed the map is here — by the rim, and towards the poles —
        // picks which copy to read, so fine grain does not glitter as it turns.
        const squeeze = detail * Math.max(1 / Math.max(f.z, 0.02), 1 / Math.max(Math.cos(f.lat * DEG), 0.02));
        level[n] = squeeze < 2 ? 0 : squeeze < 4 ? 1 : squeeze < 8 ? 2 : 3;
        // The lamp: lit from the upper left, a warm glow where it faces it, and
        // darker and cooler round towards the lower right and the rim.
        const nz = Math.sqrt(Math.max(0, 1 - Math.min(1, d) * Math.min(1, d)));
        const facing = sx * k * LAMP.x + sy * k * LAMP.y + nz * LAMP.z;
        const lit = Math.min(1, Math.max(0, (facing + 0.3) / 1.2));
        light[n] = Math.round(255 * (0.5 + 0.5 * lit ** 0.85) * (0.84 + 0.16 * Math.sqrt(nz)));
        warm[n] = facing > 0 ? Math.round(255 * facing ** 10 * 0.2) : 0;
        edge[n] = Math.round(255 * Math.min(1, Math.max(0, (1 - d) * R + 0.5)));
        n += 1;
      }
    }
    const glob = document.createElement('canvas');
    glob.width = glob.height = size;
    const image = new ImageData(size, size);
    table = {
      size,
      x0,
      y0,
      index: index.subarray(0, n),
      row: row.subarray(0, n),
      col: col.subarray(0, n),
      level: level.subarray(0, n),
      light: light.subarray(0, n),
      warm: warm.subarray(0, n),
      edge: edge.subarray(0, n),
      image,
      out: new Uint32Array(image.data.buffer),
      canvas: glob,
    };

    // The parallels never move as the globe turns about its axis, so they are
    // worked out once: the part of each on the face, as a line on the page.
    parallels = [-60, -30, 0, 30, 60].map((lat) => {
      const seen: Pt[] = [];
      for (let lon = -180; lon <= 180; lon += 2) {
        const s = toScreen(lon, lat, 0);
        if (s.z >= 0) seen.push({ x: cx + r * s.x, y: cy - r * s.y });
      }
      return seen;
    });
  }

  /** The paint, wrapped onto the ball and lit. */
  function wrap(spin: number) {
    const tb = table!;
    const W = sheet.width;
    const shift = ((Math.round((spin / 360) * W) % W) + W) % W;
    const levels = sheet.levels;
    const { index, row, col, level, light, warm, edge, out } = tb;
    for (let i = 0; i < index.length; i += 1) {
      const L = level[i];
      let c = col[i] - shift;
      if (c < 0) c += W;
      const lv = levels[L];
      const texel = lv.data[(row[i] >> L) * lv.width + (c >> L)];
      const a = texel >>> 24;
      if (!a) {
        out[index[i]] = 0;
        continue;
      }
      const k = light[i];
      const hi = warm[i];
      const r = Math.min(255, (((texel & 255) * k) >> 8) + hi);
      const g = Math.min(255, ((((texel >>> 8) & 255) * k * 0.985) >> 8) + ((hi * 0.9) | 0));
      const b = Math.min(255, ((((texel >>> 16) & 255) * k * 0.95) >> 8) + ((hi * 0.65) | 0));
      const alpha = (a * edge[i]) >> 8;
      out[index[i]] = ((alpha << 24) | (b << 16) | (g << 8) | r) >>> 0;
    }
    tb.canvas.getContext('2d')!.putImageData(tb.image, 0, 0);
  }

  /**
   * Pencil lines through each of `runs`: a firm pass and a faint one, each
   * with the hand's wobble — every run in one path, so a hundred strokes cost
   * the canvas two.
   */
  function pencil(g: CanvasRenderingContext2D, runs: Pt[][], seed: number, width: number, alpha: number) {
    const lines = runs.filter((p) => p.length > 1);
    if (!lines.length || alpha <= 0) return;
    g.strokeStyle = pal.graphite;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (let pass = 0; pass < 2; pass += 1) {
      const r = rng(seed + pass * 7);
      const j = pass ? 0.55 : 0.32;
      g.globalAlpha = alpha * (pass ? 0.35 : 0.85);
      g.lineWidth = width * (pass ? 0.6 : 1);
      g.beginPath();
      for (const pts of lines) {
        g.moveTo(pts[0].x + (r() - 0.5) * 2 * j, pts[0].y + (r() - 0.5) * 2 * j);
        for (let i = 1; i < pts.length; i += 1) {
          const a = pts[i - 1];
          const b = pts[i];
          const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 6));
          for (let k = 1; k <= n; k += 1) {
            g.lineTo(a.x + ((b.x - a.x) * k) / n + (r() - 0.5) * 2 * j, a.y + ((b.y - a.y) * k) / n + (r() - 0.5) * 2 * j);
          }
        }
      }
      g.stroke();
    }
    g.globalAlpha = 1;
  }

  /** The shading: diagonal pencil strokes over the crescent of the globe turned away from the lamp. */
  function hatch(g: CanvasRenderingContext2D) {
    const { cx, cy, r } = place();
    g.save();
    // Inside the globe, and outside the circle the lamp lights.
    g.beginPath();
    g.arc(cx, cy, r, 0, 2 * Math.PI);
    g.clip();
    g.beginPath();
    g.rect(cx - r - 2, cy - r - 2, 2 * r + 4, 2 * r + 4);
    g.arc(cx + LAMP.x * r * 0.62, cy - LAMP.y * r * 0.62, r * 1.08, 0, 2 * Math.PI);
    g.clip('evenodd');
    const runs: Pt[][] = [];
    for (let off = -r * Math.SQRT2; off < r * Math.SQRT2; off += 5) runs.push([{ x: cx + off - r, y: cy + r }, { x: cx + off + r, y: cy - r }]);
    pencil(g, runs, 77, 0.8, 1);
    g.restore();
  }

  /** A line on the globe as it is on the page: the parts on the face, cut exactly at the rim. */
  function projected(line: Line, spin: number): Pt[][] {
    const { cx, cy, r } = place();
    const runs: Pt[][] = [];
    let run: Pt[] = [];
    let prev: { x: number; y: number; z: number } | null = null;
    const put = (x: number, y: number) => run.push({ x: cx + r * x, y: cy - r * y });
    for (let i = 0; i < line.length; i += 2) {
      const s = toScreen(line[i], line[i + 1], spin);
      if (prev && prev.z >= 0 !== s.z >= 0) {
        // Crossing the rim: the point where the line goes over it.
        const k = prev.z / (prev.z - s.z);
        const x = prev.x + (s.x - prev.x) * k;
        const y = prev.y + (s.y - prev.y) * k;
        const n = Math.hypot(x, y) || 1;
        put(x / n, y / n);
        if (s.z < 0) {
          runs.push(run);
          run = [];
        }
      }
      if (s.z >= 0) put(s.x, s.y);
      prev = s;
    }
    runs.push(run);
    return runs;
  }

  function draw(spin: number) {
    const tb = table!;
    const { cx, cy, r } = place();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // The pencil's wobble is fixed: a line drawn once, turning with the globe.
    const seed = 1;

    // The globe's soft shadow on the page, down and to the right of it.
    const shadow = ctx.createRadialGradient(cx + r * 0.1, cy + r * 0.13, r * 0.8, cx + r * 0.1, cy + r * 0.13, r * 1.16);
    shadow.addColorStop(0, pal.shadow);
    shadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = shadow;
    ctx.fillRect(cx - r * 1.3, cy - r * 1.3, r * 2.8, r * 2.8);
    ctx.globalAlpha = 1;

    // The paint.
    wrap(spin);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(tb.canvas, tb.x0, tb.y0);

    // Pencil shading on the side away from the lamp, laid lightly over the colour.
    if (!hatching) {
      hatching = document.createElement('canvas');
      hatching.width = canvas.width;
      hatching.height = canvas.height;
      const g = hatching.getContext('2d')!;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      hatch(g);
    }
    ctx.globalAlpha = 0.12;
    ctx.drawImage(hatching, 0, 0);
    ctx.globalAlpha = 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // The parallels and meridians, faint; the axis poking out at the poles; the coastlines.
    pencil(ctx, parallels, seed + 900, 0.8, 0.28);
    const dir = { x: Math.sin(TILT * DEG), y: -Math.cos(TILT * DEG) };
    const stub = (side: number) => [
      { x: cx + dir.x * r * side, y: cy + dir.y * r * side },
      { x: cx + dir.x * r * side * 1.1, y: cy + dir.y * r * side * 1.1 },
    ];
    pencil(ctx, [stub(1), stub(-1)], seed + 950, 1.1, 0.6);
    pencil(ctx, all.meridians.flatMap((m) => projected(m, spin)), seed + 1000, 0.8, 0.28);
    pencil(ctx, all.coasts.flatMap((c) => projected(c, spin)), seed + 2000, 1.15, 0.9);

    // The outline: a firm line round, and a lighter second go.
    const circle = (from: number, grow: number): Pt[] => {
      const pts: Pt[] = [];
      for (let i = 0; i <= 96; i += 1) {
        const a = from + (i / 96) * 2 * Math.PI;
        pts.push({ x: cx + Math.cos(a) * r * grow, y: cy + Math.sin(a) * r * grow });
      }
      return pts;
    };
    pencil(ctx, [circle(-1.9, 1.003)], seed + 5, 1.5, 0.9);
    pencil(ctx, [circle(-0.4, 1.012)], seed + 6, 0.9, 0.4);
  }

  return {
    sheet,
    marks: all,
    resize(nw, nh, ndpr) {
      w = nw;
      h = nh;
      dpr = ndpr;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      build();
    },
    draw,
    globe: place,
  };
}
