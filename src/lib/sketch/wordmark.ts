/**
 * The wordmark, drawn in pencil.
 *
 * Each line of type is outlined three times — a firm pass and two lighter ones
 * a pixel or so off — then cross-hatched in, the way a letterer blocks in a
 * title on the first page of a sketchbook. The outline is revealed left to
 * right as the pencil goes; the hatching arrives once the outline is closed.
 *
 * `boil` is the stop-motion shimmer: every few frames the passes are nudged by
 * seeded noise, so the drawing breathes without ever looking random.
 */

type Line = { text: string; align: 'left' | 'right' };

/** A stable hash to 0..1, so a given boil frame always wobbles the same way. */
function hash(a: number, b: number): number {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export type WordmarkLayout = { size: number; lineHeight: number; height: number };

/** The font size at which the widest line exactly fills `width`. */
export function layoutWordmark(
  ctx: CanvasRenderingContext2D,
  lines: Line[],
  family: string,
  width: number,
): WordmarkLayout {
  ctx.font = `800 100px ${family}`;
  const widest = Math.max(...lines.map((l) => ctx.measureText(l.text).width));
  const size = Math.floor((width / widest) * 100 * 0.995);
  const lineHeight = size * 0.86;
  return { size, lineHeight, height: lineHeight * lines.length + size * 0.14 };
}

export function drawWordmark(
  ctx: CanvasRenderingContext2D,
  opts: {
    lines: Line[];
    family: string;
    width: number;
    layout: WordmarkLayout;
    /** 0..1: how much has been drawn. */
    progress: number;
    boil: number;
    ink: string;
    hatch: HTMLCanvasElement;
  },
) {
  const { lines, family, width, layout, progress, boil, ink, hatch } = opts;
  const { size, lineHeight } = layout;
  ctx.font = `800 ${size}px ${family}`;
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = ink;

  lines.forEach((line, i) => {
    const w = ctx.measureText(line.text).width;
    const x = line.align === 'left' ? 0 : width - w;
    const y = lineHeight * (i + 1) - size * 0.06;

    // Each line takes its share of the outline, in order.
    const share = Math.max(0, Math.min(1, progress * 1.4 * lines.length - i * 0.9));
    if (share <= 0) return;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 10, y - size, (w + 20) * share, size * 1.3);
    ctx.clip();
    for (let k = 0; k < 3; k += 1) {
      const jx = (hash(boil * 3 + k, i) - 0.5) * (k === 0 ? 1.2 : 3);
      const jy = (hash(boil * 3 + k, i + 17) - 0.5) * (k === 0 ? 1.2 : 3);
      ctx.globalAlpha = k === 0 ? 0.92 : 0.32;
      ctx.lineWidth = k === 0 ? Math.max(1.2, size / 110) : Math.max(0.7, size / 220);
      ctx.strokeText(line.text, x + jx, y + jy);
    }
    ctx.restore();
  });

  // The hatching: text as a mask over a sheet of cross-hatch, once the outline closes.
  const fill = Math.max(0, Math.min(1, (progress - 0.62) / 0.38));
  if (fill > 0) {
    ctx.save();
    ctx.globalAlpha = 0.9 * fill;
    ctx.drawImage(hatch, 0, 0, hatch.width, hatch.height, 0, 0, width, layout.height);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

/** The letters, cross-hatched, as an offscreen canvas at device resolution. */
export function hatchedLetters(
  lines: Line[],
  family: string,
  width: number,
  layout: WordmarkLayout,
  dpr: number,
  ink: string,
): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(width * dpr));
  c.height = Math.max(1, Math.round(layout.height * dpr));
  const g = c.getContext('2d')!;
  g.scale(dpr, dpr);
  g.font = `800 ${layout.size}px ${family}`;
  g.fillStyle = '#000';
  lines.forEach((line, i) => {
    const w = g.measureText(line.text).width;
    const x = line.align === 'left' ? 0 : width - w;
    g.fillText(line.text, x, layout.lineHeight * (i + 1) - layout.size * 0.06);
  });
  // Both hatch directions on their own sheet, then kept only inside the
  // letters in one composite — `source-in` keeps only the latest thing drawn,
  // so hatching straight onto the mask would let the second pass erase the first.
  const sheet = document.createElement('canvas');
  sheet.width = c.width;
  sheet.height = c.height;
  const s = sheet.getContext('2d')!;
  s.scale(dpr, dpr);
  s.strokeStyle = ink;
  const step = Math.max(3, layout.size / 36);
  s.lineWidth = Math.max(0.9, step * 0.36);
  const h = layout.height;
  s.beginPath();
  for (let x = -h; x < width + h; x += step) {
    s.moveTo(x, h);
    s.lineTo(x + h, 0);
  }
  s.stroke();
  s.globalAlpha = 0.55;
  s.beginPath();
  for (let x = -h; x < width + h; x += step * 1.7) {
    s.moveTo(x, 0);
    s.lineTo(x + h, h);
  }
  s.stroke();

  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.drawImage(sheet, 0, 0);
  return c;
}
