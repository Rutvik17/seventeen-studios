/**
 * The paper the globe is drawn on, and its tooth.
 *
 * The sheet is warm cream with soft mottling where the pulp lay thicker, a
 * fine grain, a few loose fibres, and the light of a desk lamp from the upper
 * left falling away into the corners. It is made once for each size of the
 * drawing.
 *
 * The tooth is the paper's surface roughness: a crayon's wax catches the
 * bumps and skips the hollows, so flecks of paper show through the colour.
 */

import { rng } from '@/lib/sketchbook/geometry';

type Rgb = [number, number, number];

function rgb(hex: string): Rgb {
  const h = hex.trim().replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/** A canvas of random grey noise, `w` × `h`, from `seed`. */
function noise(w: number, h: number, seed: number): HTMLCanvasElement {
  const c = canvas(w, h);
  const g = c.getContext('2d')!;
  const img = g.createImageData(c.width, c.height);
  const r = rng(seed);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(r() * 256);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

/**
 * The sheet, `w` × `h` device pixels: `paper` is its colour, `shade` the
 * warm dark the lamp's light falls off into.
 */
export function makePaper(w: number, h: number, paper: string, shade: string): HTMLCanvasElement {
  const c = canvas(w, h);
  const g = c.getContext('2d')!;
  const [sr, sg, sb] = rgb(shade);
  g.fillStyle = paper;
  g.fillRect(0, 0, c.width, c.height);

  // Mottling: coarse noise, smoothed by scaling it up, laid on lightly.
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  for (const [scale, alpha, seed] of [[64, 0.07, 11], [18, 0.05, 12]] as const) {
    g.globalAlpha = alpha;
    g.globalCompositeOperation = 'soft-light';
    g.drawImage(noise(Math.ceil(c.width / scale) + 2, Math.ceil(c.height / scale) + 2, seed), 0, 0, c.width + 2 * scale, c.height + 2 * scale);
  }

  // Fine grain: a small tile of noise, repeated — too fine for the repeat to show.
  g.globalCompositeOperation = 'soft-light';
  g.globalAlpha = 0.16;
  const grain = g.createPattern(noise(160, 160, 13), 'repeat');
  if (grain) {
    g.fillStyle = grain;
    g.fillRect(0, 0, c.width, c.height);
  }

  // Loose fibres: short, faint, curling threads.
  g.globalCompositeOperation = 'multiply';
  const r = rng(14);
  const fibres = Math.round((c.width * c.height) / 9000);
  g.lineCap = 'round';
  for (let i = 0; i < fibres; i += 1) {
    const x = r() * c.width;
    const y = r() * c.height;
    const len = 6 + r() * 22;
    const a = r() * Math.PI;
    const bend = (r() - 0.5) * len * 0.8;
    g.globalAlpha = 0.05 + r() * 0.08;
    g.strokeStyle = `rgb(${sr}, ${sg}, ${sb})`;
    g.lineWidth = 0.5 + r() * 0.7;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a) * len * 0.5 - Math.sin(a) * bend, y + Math.sin(a) * len * 0.5 + Math.cos(a) * bend, x + Math.cos(a) * len, y + Math.sin(a) * len);
    g.stroke();
  }

  // The lamp: warm light from the upper left, falling off to the corners.
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  const lamp = g.createRadialGradient(c.width * 0.22, c.height * 0.12, 0, c.width * 0.22, c.height * 0.12, Math.hypot(c.width, c.height) * 0.62);
  lamp.addColorStop(0, `rgba(255, 226, 170, 0.34)`);
  lamp.addColorStop(0.45, `rgba(255, 214, 150, 0.1)`);
  lamp.addColorStop(1, `rgba(255, 210, 140, 0)`);
  g.fillStyle = lamp;
  g.fillRect(0, 0, c.width, c.height);
  const dusk = g.createRadialGradient(c.width * 0.4, c.height * 0.38, Math.min(c.width, c.height) * 0.35, c.width * 0.5, c.height * 0.5, Math.hypot(c.width, c.height) * 0.72);
  dusk.addColorStop(0, `rgba(${sr}, ${sg}, ${sb}, 0)`);
  dusk.addColorStop(1, `rgba(${sr}, ${sg}, ${sb}, 0.3)`);
  g.fillStyle = dusk;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

/**
 * The tooth under the crayon, for the pixels `index` of a square `size`
 * device pixels across: how much of the crayon catches at each, 0–255 —
 * nearly all of it, with small hollows where a little paper shows through.
 * Bumps a pixel or two across: seeded random heights on a lattice, blended
 * between. One, held still, so the globe turns under it without a flicker.
 */
export function makeTooth(size: number, index: Int32Array): Uint8Array {
  const cell = 2.2;
  const cols = Math.ceil(size / cell) + 2;
  {
    const r = rng(101);
    const lattice = Float32Array.from({ length: cols * cols }, () => r());
    const tooth = new Uint8Array(index.length);
    for (let i = 0; i < index.length; i += 1) {
      const gx = (index[i] % size) / cell;
      const gy = Math.floor(index[i] / size) / cell;
      const x0 = gx | 0;
      const y0 = gy | 0;
      const fx = gx - x0;
      const fy = gy - y0;
      const a = lattice[y0 * cols + x0];
      const b = lattice[y0 * cols + x0 + 1];
      const c = lattice[(y0 + 1) * cols + x0];
      const d = lattice[(y0 + 1) * cols + x0 + 1];
      const n = a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
      // The lowest few bumps are hollows the wax only half fills; the edge is soft.
      tooth[i] = Math.round(255 * Math.min(1, 0.7 + Math.max(0, (n - 0.05) / 0.12)));
    }
    return tooth;
  }
}
