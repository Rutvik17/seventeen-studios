/**
 * The wordmark, handwritten across the page in crayon: one crayon a word, each
 * letter filled in with close back-and-forth strokes, one letter after
 * another, the way a name gets written big on the first page of a sketchbook.
 * The hand leans a little, and no two letters sit quite the same — each is
 * turned, raised and sized a hair differently. The wax skips over the paper's
 * tooth, and the letters' edges waver as a hand's do.
 *
 * The finished lettering is painted once, off screen; writing it is a mask
 * over it — the same back-and-forth path, stroked a little wider, grown along
 * its length — so the colour appears exactly where the crayon has been.
 */

import { rng } from '@/lib/sketchbook/geometry';
import { grain } from '@/lib/sketchbook/pencil';

type Line = { text: string; align: 'left' | 'right' };

/** The type size, where each line sits (its left end on the baseline), and the height it all needs. */
export type WordmarkLayout = { size: number; height: number; places: { x: number; y: number }[] };

/** One letter's back-and-forth path, in page pixels, and how long it is. */
type Scribble = { pts: Float32Array; length: number };

/** What the title is drawn from: the finished lettering, a sheet to mask it with, and the paths. */
export type WordmarkArt = {
  face: HTMLCanvasElement;
  reveal: HTMLCanvasElement;
  scribbles: Scribble[];
  total: number;
  /** How wide the crayon is, in CSS pixels. */
  nib: number;
};

/** Bold, as a crayon pressed hard. */
const WEIGHT = 700;
/** How far the hand leans: the tangent of 8°. */
const SLANT = Math.tan((8 * Math.PI) / 180);
/** The largest the title is written, in CSS pixels, however wide the page. */
const LARGEST = 230;
/** How far the second line starts in, as a fraction of the first line's width. */
const INDENT = 0.4;

const fontAt = (size: number, family: string) => `${WEIGHT} ${size}px ${family}`;

/** The size that fits the widest line across `width` (up to `LARGEST`), and where the lines go. */
export function layoutWordmark(
  ctx: CanvasRenderingContext2D,
  lines: Line[],
  family: string,
  width: number,
): WordmarkLayout {
  ctx.font = fontAt(100, family);
  const ms = lines.map((l) => ctx.measureText(l.text));
  const ascent = Math.max(...ms.map((m) => m.actualBoundingBoxAscent)) / 100;
  const descent = Math.max(...ms.map((m) => m.actualBoundingBoxDescent)) / 100;
  // A line's reach, per unit of size: its own width, and how far its tops lean out.
  const reach = (m: TextMetrics) => m.width / 100 + ascent * SLANT + 0.08;
  const size = Math.floor(Math.min(LARGEST, width / Math.max(...ms.map(reach))));
  const lineHeight = size * 0.84;
  const first = size * (ascent + 0.06);
  const places = lines.map((line, i) => {
    const w = (ms[i].width / 100) * size;
    const x =
      line.align === 'left' || i === 0
        ? size * 0.04
        : Math.min(width - w - size * (ascent * SLANT + 0.06), (ms[0].width / 100) * size * INDENT);
    return { x, y: first + lineHeight * i };
  });
  return { size, height: first + lineHeight * (lines.length - 1) + size * (descent + 0.1), places };
}

export function drawWordmark(
  ctx: CanvasRenderingContext2D,
  opts: { width: number; layout: WordmarkLayout; /** 0..1: how much has been written. */ progress: number; art: WordmarkArt },
) {
  const { width, layout, progress, art } = opts;
  const h = layout.height;
  if (progress >= 1) {
    ctx.drawImage(art.face, 0, 0, width, h);
    return;
  }
  if (progress <= 0) return;

  // The mask: every letter's path up to where the crayon has got to.
  const dpr = art.reveal.width / width;
  const r = art.reveal.getContext('2d')!;
  r.setTransform(dpr, 0, 0, dpr, 0, 0);
  r.clearRect(0, 0, width, h);
  r.lineWidth = art.nib * 1.9;
  r.lineCap = 'round';
  r.lineJoin = 'round';
  r.beginPath();
  let left = progress * art.total;
  for (const s of art.scribbles) {
    if (left <= 0) break;
    const { pts } = s;
    r.moveTo(pts[0], pts[1]);
    for (let k = 2; k < pts.length && left > 0; k += 2) {
      const dx = pts[k] - pts[k - 2];
      const dy = pts[k + 1] - pts[k - 1];
      const d = Math.hypot(dx, dy);
      const f = Math.min(1, left / (d || 1));
      r.lineTo(pts[k - 2] + dx * f, pts[k - 1] + dy * f);
      left -= d;
    }
  }
  r.stroke();

  ctx.drawImage(art.face, 0, 0, width, h);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(art.reveal, 0, 0, width, h);
  ctx.globalCompositeOperation = 'source-over';
}

/** A blank sheet of `w` × `h` device pixels, drawn on in CSS pixels. */
function sheet(w: number, h: number, dpr: number) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d')!;
  g.scale(dpr, dpr);
  return { canvas, g };
}

type Box = { x0: number; x1: number; y0: number; y1: number };

/** The part of the line through (cx, cy) along (ux, uy) that lies inside the box, or null. */
function clipToBox(cx: number, cy: number, ux: number, uy: number, box: Box) {
  let t0 = -Infinity;
  let t1 = Infinity;
  for (const [p, lo, hi] of [
    [ux, box.x0 - cx, box.x1 - cx],
    [uy, box.y0 - cy, box.y1 - cy],
  ] as const) {
    if (Math.abs(p) < 1e-9) {
      if (lo > 0 || hi < 0) return null;
      continue;
    }
    const a = lo / p;
    const b = hi / p;
    t0 = Math.max(t0, Math.min(a, b));
    t1 = Math.min(t1, Math.max(a, b));
  }
  return t1 > t0 ? [t0, t1] : null;
}

/**
 * Everything that does not change from frame to frame: the finished lettering
 * at device resolution — one crayon a line, from `colours` — and the path the
 * crayon takes through each letter.
 */
export function prepareWordmark(
  lines: Line[],
  family: string,
  width: number,
  layout: WordmarkLayout,
  dpr: number,
  colours: string[],
): WordmarkArt {
  const { size } = layout;
  const font = fontAt(size, family);
  const W = Math.max(1, Math.round(width * dpr));
  const H = Math.max(1, Math.round(layout.height * dpr));
  const rand = rng(17);
  const nib = Math.max(2, size / 26);

  // Each letter: where it sits and how it is turned, and its path — strokes at
  // a slant of the letter's own, a crayon's width apart, joined end to end so
  // the hand never lifts inside a letter.
  const measure = sheet(1, 1, 1).g;
  measure.font = font;
  type Letter = { ch: string; line: number; frame: DOMMatrix; box: Box };
  const letters: Letter[] = [];
  lines.forEach((line, i) => {
    const { x: ox, y: oy } = layout.places[i];
    const leanOver = new DOMMatrix([1, 0, -SLANT, 1, SLANT * oy, 0]);
    const chars = Array.from(line.text);
    chars.forEach((ch, j) => {
      const before = measure.measureText(chars.slice(0, j).join('')).width;
      if (!ch.trim()) return;
      const m = measure.measureText(ch);
      const frame = leanOver
        .translate(ox + before, oy + (rand() - 0.5) * size * 0.035)
        .rotate((rand() - 0.5) * 4)
        .scale(1 + (rand() - 0.5) * 0.05);
      const pad = size * 0.05;
      const box = {
        x0: -m.actualBoundingBoxLeft - pad,
        x1: m.actualBoundingBoxRight + pad,
        y0: -m.actualBoundingBoxAscent - pad,
        y1: m.actualBoundingBoxDescent + pad,
      };
      letters.push({ ch, line: i, frame, box });
    });
  });

  const scribbles: (Scribble & { line: number })[] = letters.map(({ line, frame, box }) => {
    const angle = -1.05 + (rand() - 0.5) * 0.35;
    const ux = Math.cos(angle);
    const uy = Math.sin(angle);
    const cx = (box.x0 + box.x1) / 2;
    const cy = (box.y0 + box.y1) / 2;
    const reach = box.x1 - box.x0 + box.y1 - box.y0;
    const pts: number[] = [];
    const put = (x: number, y: number) => {
      const p = frame.transformPoint(new DOMPoint(x, y));
      pts.push(p.x, p.y);
    };
    let flip = false;
    for (let t = -reach / 2; t <= reach / 2; t += nib) {
      const px = cx - uy * t;
      const py = cy + ux * t;
      const seg = clipToBox(px, py, ux, uy, box);
      if (!seg) continue;
      const [a, b] = flip ? [seg[1], seg[0]] : seg;
      put(px + ux * a, py + uy * a);
      put(px + ux * b, py + uy * b);
      flip = !flip;
    }
    let length = 0;
    for (let k = 2; k < pts.length; k += 2) length += Math.hypot(pts[k] - pts[k - 2], pts[k + 1] - pts[k - 1]);
    return { pts: Float32Array.from(pts), length, line };
  });

  // The wax: each path stroked with a crayon, a little unevenly, then gone
  // over once more, lightly, across it — from the start of each stroke to the
  // start of the next, which the back-and-forth has put on the letter's other side.
  const wax = sheet(W, H, dpr);
  const w = wax.g;
  w.lineCap = 'round';
  w.lineJoin = 'round';
  for (const s of scribbles) {
    w.strokeStyle = colours[s.line % colours.length];
    const { pts } = s;
    for (let k = 2; k < pts.length; k += 2) {
      w.globalAlpha = 0.78 + rand() * 0.22;
      w.lineWidth = nib * (0.8 + rand() * 0.35);
      w.beginPath();
      w.moveTo(pts[k - 2], pts[k - 1]);
      w.lineTo(pts[k], pts[k + 1]);
      w.stroke();
    }
    w.globalAlpha = 0.35;
    w.lineWidth = nib * 0.8;
    w.beginPath();
    for (let k = 0; k + 5 < pts.length; k += 4) {
      w.moveTo(pts[k], pts[k + 1]);
      w.lineTo(pts[k + 4], pts[k + 5]);
    }
    w.stroke();
  }
  // The paper's tooth, where the wax skipped over it — specks a crayon's
  // grain across, not a screen's pixel.
  w.setTransform(1, 0, 0, 1, 0, 0);
  w.globalAlpha = 0.6;
  w.globalCompositeOperation = 'destination-out';
  const tooth = w.createPattern(grain('#000', 29, 0.22), 'repeat')!;
  tooth.setTransform(new DOMMatrix().scale(Math.max(1, dpr * 0.75)));
  w.fillStyle = tooth;
  w.fillRect(0, 0, W, H);

  // The letters, each where its frame puts it, their edges wavering: cut
  // into thin bands, each nudged sideways by a slow wander and a quick tremor.
  const upright = sheet(W, H, dpr);
  upright.g.font = font;
  upright.g.fillStyle = '#000';
  for (const l of letters) {
    upright.g.save();
    upright.g.transform(l.frame.a, l.frame.b, l.frame.c, l.frame.d, l.frame.e, l.frame.f);
    upright.g.fillText(l.ch, 0, 0);
    upright.g.restore();
  }
  const face = sheet(W, H, 1);
  const band = Math.max(2, Math.round(dpr * 1.5));
  const wander = (size / 150) * dpr;
  for (let y = 0; y < H; y += band) {
    const dx = wander * (Math.sin(y * 0.019 + 1.3) * 0.6 + Math.sin(y * 0.067 + 0.4) * 0.3 + (rand() - 0.5) * 0.6);
    face.g.drawImage(upright.canvas, 0, y, W, band, dx, y, W, band);
  }

  // The wax, kept only inside the letters.
  face.g.globalCompositeOperation = 'source-in';
  face.g.drawImage(wax.canvas, 0, 0);

  const total = scribbles.reduce((sum, s) => sum + s.length, 0);
  return { face: face.canvas, reveal: sheet(W, H, 1).canvas, scribbles, total, nib };
}
