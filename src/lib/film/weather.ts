/**
 * WEATHER, AND THE LIGHTS OF THE SKY.
 *
 * Rain is a slant of short graphite strokes; snow, soft dots drifting on a
 * wind that changes its mind; in autumn leaves come off the crowns and turn
 * over on the way down, and in spring the blossom does. Summer has swifts.
 * Night has stars, which twinkle, and a moon with a halo; dusk has a low sun.
 * A thunderstorm has lightning: the page goes white for an instant, and a
 * bolt is drawn from the cloud to the hills.
 *
 * Rain and snow fall in screen space — they are in front of the camera, not
 * in the scene. Leaves fall in the world, from the tree they grew on.
 */

import type { Campus, Tree } from './campus';
import { between, pick, rng, type Rng } from './random';
import type { Pt } from './wash';

interface Drop {
  x: number;
  y: number;
  v: number;
  l: number;
}

interface Flake {
  x: number;
  y: number;
  v: number;
  s: number;
  p: number;
}

interface Leaf {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  a: number;
  size: number;
  colour: string;
  floor: number;
  life: number;
  petal: boolean;
}

interface Bird {
  x: number;
  y: number;
  v: number;
  p: number;
  s: number;
}

const LEAF = ['#e08a2b', '#d4602a', '#eba42c', '#b8392c', '#c9772e'];
const PETAL = ['#f2a9bb', '#f7c6d2', '#e98aa5'];

export class Weather {
  private r: Rng;
  private drops: Drop[] = [];
  private flakes: Flake[] = [];
  private leaves: Leaf[] = [];
  private birds: Bird[] = [];
  private stars: [number, number, number, number][] = [];
  private trees: Tree[];
  private flash = 0;
  private bolt: Pt[] | null = null;
  private nextStrike = 3;
  private wind = 0;
  private time = 0;

  constructor(campus: Campus) {
    this.r = rng(4242);
    this.trees = campus.trees.filter((t) => t.kind !== 'palm');
    const r = this.r;
    for (let k = 0; k < 520; k++) this.drops.push({ x: r(), y: r(), v: between(r, 0.9, 1.3), l: between(r, 0.6, 1.2) });
    for (let k = 0; k < 360; k++) this.flakes.push({ x: r(), y: r(), v: between(r, 0.5, 1.2), s: between(r, 0.6, 1.8), p: r() * 6.28 });
    for (let k = 0; k < 220; k++) this.stars.push([r(), r(), between(r, 0.4, 1.4), r() * 6.28]);
    for (let k = 0; k < 7; k++) this.birds.push({ x: between(r, -400, 1600), y: between(r, 170, 300), v: between(r, 50, 80), p: r() * 6.28, s: between(r, 0.8, 1.3) });
  }

  update(dt: number, w: { leaves: number; petals: number; birds: number; lightning: number }) {
    const r = this.r;
    this.time += dt;
    this.wind = Math.sin(this.time * 0.23) * 0.6 + Math.sin(this.time * 0.61) * 0.3;

    // Leaves and petals: born in a crown, fall to the ground under it, lie a moment, fade.
    const want = Math.round(w.leaves * 46 + w.petals * 40);
    if (this.leaves.length < want && r() < dt * 12) {
      const t = pick(r, this.trees);
      const petal = w.petals > w.leaves;
      if (!petal || t.kind === 'blossom' || t.kind === 'street') {
        const a = r() * 6.28;
        const d = Math.sqrt(r()) * t.r * 0.8;
        this.leaves.push({
          x: t.cx + Math.cos(a) * d,
          y: t.cy + Math.sin(a) * d * 0.7,
          vx: between(r, -6, 6),
          vy: between(r, 12, 24) * (petal ? 0.6 : 1),
          spin: r() * 6.28,
          a: 0,
          size: petal ? between(r, 1.6, 2.6) : between(r, 2.2, 3.6),
          colour: pick(r, petal ? PETAL : LEAF),
          floor: t.base + between(r, 4, 70),
          life: 0,
          petal,
        });
      }
    }
    for (const l of this.leaves) {
      l.life += dt;
      if (l.y < l.floor) {
        l.x += (l.vx + this.wind * (l.petal ? 26 : 14) + Math.sin(l.spin) * 8) * dt;
        l.y += l.vy * dt;
        l.spin += dt * (l.petal ? 3 : 2.2);
        l.a = Math.min(1, l.a + dt * 2);
      } else {
        l.a -= dt * 0.25;
      }
    }
    this.leaves = this.leaves.filter((l) => l.a > 0 || l.life < 0.5);

    for (const b of this.birds) {
      b.x += b.v * dt;
      b.p += dt * 9;
      if (b.x > 1800) {
        b.x = between(r, -600, -200);
        b.y = between(r, 170, 300);
      }
    }

    this.flash = Math.max(0, this.flash - dt * 3.2);
    if (w.lightning > 0.5) {
      this.nextStrike -= dt;
      if (this.nextStrike <= 0) {
        this.flash = 1;
        this.bolt = this.makeBolt();
        this.nextStrike = between(r, 2.5, 6);
      }
    }
    if (this.flash <= 0) this.bolt = null;
  }

  private makeBolt(): Pt[] {
    const r = this.r;
    let x = between(r, 300, 1400);
    let y = 60;
    const pts: Pt[] = [[x, y]];
    while (y < 380) {
      x += between(r, -26, 26);
      y += between(r, 18, 34);
      pts.push([x, y]);
    }
    return pts;
  }

  /** Behind the land: birds, in the world. */
  drawBirds(ctx: CanvasRenderingContext2D, amount: number) {
    if (amount < 0.02) return;
    ctx.strokeStyle = `rgba(38,36,42,${0.7 * amount})`;
    ctx.lineWidth = 0.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const b of this.birds) {
      const f = Math.sin(b.p) * 3 * b.s;
      ctx.moveTo(b.x - 5 * b.s, b.y - f);
      ctx.quadraticCurveTo(b.x - 2 * b.s, b.y - 1, b.x, b.y);
      ctx.quadraticCurveTo(b.x + 2 * b.s, b.y - 1, b.x + 5 * b.s, b.y - f);
    }
    ctx.stroke();
  }

  /** In front of the land: leaves and petals, in the world. */
  drawLeaves(ctx: CanvasRenderingContext2D) {
    for (const l of this.leaves) {
      ctx.globalAlpha = Math.max(0, l.a) * 0.85;
      ctx.fillStyle = l.colour;
      ctx.beginPath();
      ctx.ellipse(l.x, l.y, l.size, l.size * Math.abs(Math.cos(l.spin)) * 0.55 + 0.3, l.spin, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /** Stars, twinkling, in screen space, above `limit`. */
  drawStars(ctx: CanvasRenderingContext2D, w: number, limit: number, amount: number, dpr: number) {
    if (amount < 0.02 || limit <= 0) return;
    ctx.fillStyle = '#fffaf0';
    for (const [sx, sy, s, p] of this.stars) {
      const y = sy * limit;
      const a = amount * (0.45 + 0.55 * Math.sin(this.time * 1.7 + p)) * (1 - sy * 0.6);
      if (a <= 0.02) continue;
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(sx * w, y, s * dpr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /** The moon, with its halo, in the world. */
  drawMoon(ctx: CanvasRenderingContext2D, x: number, y: number, amount: number) {
    if (amount < 0.02) return;
    const halo = ctx.createRadialGradient(x, y, 8, x, y, 120);
    halo.addColorStop(0, `rgba(255,248,225,${0.45 * amount})`);
    halo.addColorStop(0.3, `rgba(220,226,255,${0.16 * amount})`);
    halo.addColorStop(1, 'rgba(220,226,255,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(x - 120, y - 120, 240, 240);
    ctx.globalAlpha = amount;
    ctx.fillStyle = '#fbf6e6';
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(200,190,170,0.5)';
    for (const [dx, dy, s] of [[-4, -3, 3.4], [5, 2, 2.4], [-1, 6, 1.8], [6, -6, 1.5]]) {
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /** A low sun: at dusk behind the right-hand hills, at dawn rising on the left. */
  drawSun(ctx: CanvasRenderingContext2D, x: number, y: number, amount: number, warm: string) {
    if (amount < 0.02) return;
    const g = ctx.createRadialGradient(x, y, 4, x, y, 260);
    g.addColorStop(0, `rgba(${warm},${0.55 * amount})`);
    g.addColorStop(0.15, `rgba(${warm},${0.25 * amount})`);
    g.addColorStop(1, `rgba(${warm},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - 260, y - 260, 520, 520);
    ctx.globalAlpha = amount * 0.9;
    ctx.fillStyle = '#fff2d2';
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  /** Rain, in screen space. */
  drawRain(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number, dpr: number) {
    if (amount < 0.02) return;
    const n = Math.floor(this.drops.length * amount * Math.min(1, (w * h) / (1600 * 900 * dpr * dpr) + 0.3));
    const fall = this.time * 1.4;
    const slant = 0.18 + this.wind * 0.06;
    ctx.strokeStyle = `rgba(214,222,240,${0.55 * amount})`;
    ctx.lineWidth = 1 * dpr;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const len = 22 * dpr;
    for (let i = 0; i < n; i++) {
      const d = this.drops[i];
      const y = ((d.y + fall * d.v) % 1) * (h + len) - len;
      const x = ((d.x + (y / h) * slant) % 1) * w;
      ctx.moveTo(x, y);
      ctx.lineTo(x - slant * len * d.l * 1.2, y + len * d.l);
    }
    ctx.stroke();
  }

  /** Snow, in screen space. */
  drawSnow(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number, dpr: number) {
    if (amount < 0.02) return;
    const n = Math.floor(this.flakes.length * amount);
    ctx.fillStyle = `rgba(255,255,255,${0.85 * amount})`;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const f = this.flakes[i];
      const y = ((f.y + this.time * 0.05 * f.v) % 1) * (h + 10) - 5;
      const x = (((f.x + Math.sin(this.time * 0.7 + f.p) * 0.012 + this.wind * 0.02 * (y / h)) % 1) + 1) % 1;
      const s = f.s * dpr * 1.3;
      ctx.moveTo(x * w + s, y);
      ctx.arc(x * w, y, s, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  /** The strike: the sheet goes white, and the bolt is drawn. Called in world space for the bolt. */
  drawBolt(ctx: CanvasRenderingContext2D) {
    if (!this.bolt || this.flash < 0.05) return;
    ctx.strokeStyle = `rgba(255,255,250,${this.flash})`;
    ctx.lineWidth = 2.2;
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(210,220,255,0.9)';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    this.bolt.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  get flashAmount() {
    // A strike flickers: bright, dim, bright again, gone.
    const f = this.flash;
    return f * (f > 0.7 ? 1 : f > 0.5 ? 0.3 : 0.8);
  }
}
