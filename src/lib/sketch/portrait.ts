/**
 * A photograph, redrawn as a pencil sketch with coloured pencil over it.
 *
 * Runs once in the browser on the founder page, from the photo in
 * `public/founder`. Three layers come out of it:
 *
 * - **Pencil.** The classic dodge sketch: the greyscale image divided by a
 *   blurred copy of its own negative. Flat areas go to white paper, and only
 *   the edges — hairline, eyes, the smile, the collar — survive as graphite.
 *   Dark masses (hair, the jacket) get cross-hatching on top, the way a pencil
 *   blocks in shadow, instead of a flat fill.
 * - **Colour.** The photo's own colours, pushed a little more saturated, laid
 *   down only along diagonal hatch lines, so it reads as coloured pencil over
 *   the drawing rather than a tinted photograph. The red and blue light in the
 *   original becomes red and blue pencil.
 * - **Strokes.** A list of broad diagonal marks, ordered outward from the
 *   face, used to reveal the other two layers: the sketch appears as if drawn,
 *   face first, the colour following a beat behind the graphite.
 *
 * Everything is deterministic — the noise is seeded — so the drawing is the
 * same drawing on every visit.
 */

export type PortraitSketch = {
  width: number;
  height: number;
  pencil: HTMLCanvasElement;
  colour: HTMLCanvasElement;
  strokes: { x: number; y: number; a: number; l: number }[];
};

/** The part of the photo worth drawing, as fractions of its width and height. */
const CROP = { x: 0.04, y: 0.13, w: 0.9, h: 0.87 };

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A separable box blur, run twice — close enough to a Gaussian for this. */
function blur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const a = new Float32Array(src);
  const b = new Float32Array(src.length);
  for (let pass = 0; pass < 2; pass += 1) {
    for (let y = 0; y < h; y += 1) {
      let sum = 0;
      for (let x = -r; x <= r; x += 1) sum += a[y * w + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x += 1) {
        b[y * w + x] = sum / (2 * r + 1);
        sum += a[y * w + Math.min(w - 1, x + r + 1)] - a[y * w + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x += 1) {
      let sum = 0;
      for (let y = -r; y <= r; y += 1) sum += b[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y += 1) {
        a[y * w + x] = sum / (2 * r + 1);
        sum += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x];
      }
    }
  }
  return a;
}

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function sketchPortrait(src: string, width = 560): Promise<PortraitSketch> {
  const img = await load(src);
  const sx = img.naturalWidth * CROP.x;
  const sy = img.naturalHeight * CROP.y;
  const sw = img.naturalWidth * CROP.w;
  const sh = img.naturalHeight * CROP.h;
  const w = width;
  const h = Math.round((sh / sw) * width);

  const base = document.createElement('canvas');
  base.width = w;
  base.height = h;
  const bg = base.getContext('2d', { willReadFrequently: true })!;
  bg.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  const px = bg.getImageData(0, 0, w, h).data;

  const n = w * h;
  const lum = new Float32Array(n);
  const inv = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const l = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
    lum[i] = l;
    inv[i] = 255 - l;
  }
  const soft = blur(inv, w, h, Math.max(4, Math.round(w / 90)));

  const rand = rng(1702);
  const pencil = document.createElement('canvas');
  pencil.width = w;
  pencil.height = h;
  const pg = pencil.getContext('2d')!;
  const pout = pg.createImageData(w, h);

  const colour = document.createElement('canvas');
  colour.width = w;
  colour.height = h;
  const cg = colour.getContext('2d')!;
  const cout = cg.createImageData(w, h);

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = y * w + x;
      const l = lum[i];

      // Pencil: the dodge, then darkened so the lines have weight.
      const dodge = Math.min(255, (l * 255) / Math.max(1, 256 - soft[i]));
      let dark = Math.pow(1 - dodge / 255, 0.8) * 1.35;

      // Shadow blocked in with open hatching — one direction for mid-tones, a
      // light second pass only in the deepest darks — so it reads as pencil
      // shading rather than a printed screen.
      const shade = Math.pow(Math.max(0, 1 - l / 160), 1.6);
      const wave = Math.sin(y * 0.045 + x * 0.01) * 1.5;
      const hatchA = (x + y + wave + 3000) % 9 < 1.3 ? 1 : 0;
      const hatchB = (x - y + wave + 3000) % 13 < 1.1 ? 1 : 0;
      dark = dark * 0.85 + shade * (hatchA * 0.42 + hatchB * 0.26 * (shade > 0.55 ? 1 : 0));

      // Graphite is grainy: the paper's tooth breaks every mark up a little.
      dark *= 0.72 + rand() * 0.4;
      dark = Math.min(1, dark);
      pout.data[i * 4] = 34;
      pout.data[i * 4 + 1] = 33;
      pout.data[i * 4 + 2] = 38;
      pout.data[i * 4 + 3] = dark < 0.06 ? 0 : Math.round(dark * 235);

      // Colour: the photo's own, a touch more saturated, only on the hatch.
      const r = px[i * 4];
      const g = px[i * 4 + 1];
      const b = px[i * 4 + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const chroma = (max - min) / 255;
      const lift = 1.45;
      const cr = Math.max(0, Math.min(255, l + (r - l) * lift));
      const cgn = Math.max(0, Math.min(255, l + (g - l) * lift));
      const cb = Math.max(0, Math.min(255, l + (b - l) * lift));
      const strokeLine = (x * 0.8 + y) % 5 < 1.8 ? 1 : 0.25;
      const paper = l > 228 && chroma < 0.08;
      const weight = paper ? 0 : Math.min(1, chroma * 1.9 + (l < 120 ? 0.1 : 0.04)) * strokeLine * (0.75 + rand() * 0.35);
      cout.data[i * 4] = cr;
      cout.data[i * 4 + 1] = cgn;
      cout.data[i * 4 + 2] = cb;
      cout.data[i * 4 + 3] = Math.round(Math.min(1, weight) * 205);
    }
  }
  pg.putImageData(pout, 0, 0);
  cg.putImageData(cout, 0, 0);

  // The reveal: broad diagonal marks, drawn outward from the face.
  const face = { x: w * 0.6, y: h * 0.32 };
  const strokes: PortraitSketch['strokes'] = [];
  const cell = Math.round(w / 26);
  for (let y = -cell; y < h + cell; y += cell) {
    for (let x = -cell; x < w + cell; x += cell) {
      strokes.push({
        x: x + rand() * cell,
        y: y + rand() * cell,
        a: -0.75 + (rand() - 0.5) * 0.5,
        l: cell * (1.6 + rand() * 1.4),
      });
    }
  }
  // Each mark's place in the order is fixed once: distance from the face,
  // loosened by a little noise so the reveal is not a perfect expanding ring.
  const order = new Map(strokes.map((s) => [s, Math.hypot((s.x - face.x) / w, (s.y - face.y) / h) + rand() * 0.18]));
  strokes.sort((p, q) => order.get(p)! - order.get(q)!);

  return { width: w, height: h, pencil, colour, strokes };
}

/**
 * Draws the sketch into `view`, revealed as far as `t` seconds in: the
 * graphite over the first three seconds, the colour a second behind it.
 * Keeps its own mask canvases between calls; drawing an earlier `t` than last
 * time starts them again, so it can be replayed.
 */
export function createPortraitPainter(sketch: PortraitSketch) {
  const make = () => {
    const c = document.createElement('canvas');
    c.width = sketch.width;
    c.height = sketch.height;
    return c;
  };
  const masks = { pencil: make(), colour: make() };
  const drawn = { pencil: 0, colour: 0 };
  const scratch = make();
  const sg = scratch.getContext('2d')!;

  const fill = (which: 'pencil' | 'colour', count: number) => {
    const m = masks[which].getContext('2d')!;
    if (count < drawn[which]) {
      m.clearRect(0, 0, sketch.width, sketch.height);
      drawn[which] = 0;
    }
    m.strokeStyle = '#000';
    m.lineCap = 'round';
    m.lineWidth = sketch.width / 20;
    // Finished: the whole drawing, not whatever the marks happened to cover.
    if (count >= sketch.strokes.length) {
      if (drawn[which] < count) {
        m.fillStyle = '#000';
        m.fillRect(0, 0, sketch.width, sketch.height);
      }
      drawn[which] = count;
      return;
    }
    for (let i = drawn[which]; i < count; i += 1) {
      const s = sketch.strokes[i];
      m.beginPath();
      m.moveTo(s.x - (Math.cos(s.a) * s.l) / 2, s.y - (Math.sin(s.a) * s.l) / 2);
      m.lineTo(s.x + (Math.cos(s.a) * s.l) / 2, s.y + (Math.sin(s.a) * s.l) / 2);
      m.stroke();
    }
    drawn[which] = count;
  };

  const layer = (ctx: CanvasRenderingContext2D, which: 'pencil' | 'colour', dest: { x: number; y: number; w: number; h: number }, alpha: number) => {
    sg.globalCompositeOperation = 'source-over';
    sg.clearRect(0, 0, sketch.width, sketch.height);
    sg.drawImage(sketch[which], 0, 0);
    sg.globalCompositeOperation = 'destination-in';
    sg.drawImage(masks[which], 0, 0);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(scratch, dest.x, dest.y, dest.w, dest.h);
    ctx.restore();
  };

  return (ctx: CanvasRenderingContext2D, t: number, view: { x: number; y: number; w: number; h: number }) => {
    const total = sketch.strokes.length;
    const ease = (u: number) => 1 - (1 - Math.max(0, Math.min(1, u))) ** 2;
    fill('pencil', Math.round(total * ease(t / 3.2)));
    fill('colour', Math.round(total * ease((t - 1.1) / 3.2)));
    const s = Math.min(view.w / sketch.width, view.h / sketch.height);
    const dest = {
      w: sketch.width * s,
      h: sketch.height * s,
      x: view.x + (view.w - sketch.width * s) / 2,
      y: view.y + (view.h - sketch.height * s) / 2,
    };
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    layer(ctx, 'colour', dest, 0.85);
    ctx.restore();
    layer(ctx, 'pencil', dest, 1);
  };
}
