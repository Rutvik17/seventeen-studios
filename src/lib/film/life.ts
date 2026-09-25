/**
 * THE PEOPLE, AND THE TRAFFIC.
 *
 * Everyone here is a few pencil strokes and a dab of colour: a head, a coat,
 * legs that scissor as they walk, arms that swing against them. They walk the
 * campus's paths, come out of Endeavor's door and go back in, stand and talk
 * under Voyager's roof, and put umbrellas up when it rains. Fewer of them are
 * out at night.
 *
 * The street carries the future: pods with no wheels that hover over their
 * own shadows, drones working the air over the roofs, and now and then an air
 * taxi crossing the sky.
 *
 * Everything here is drawn every frame, in world units, straight onto the
 * screen — it moves, so there is nothing to bake.
 */

import type { Campus, Walk } from './campus';
import type { Pt } from './wash';
import { between, clamp, pick, rng, smooth, type Rng } from './random';

const GRAPHITE = 'rgba(38,36,42,0.82)';
const COATS = ['#c8423a', '#2b3f9e', '#e0a13a', '#3f7d3a', '#5a3a8e', '#d86f8c', '#2f6e78', '#8a5a3c', '#e9e2d2', '#34343c'];
const LEGS = ['#3a3d4a', '#4b4f63', '#6b5a48', '#2e2f36', '#7d7f8c'];
const SKIN = ['#f0c9a8', '#d9a57f', '#b27a55', '#8a5a3c', '#f3d6bf'];
const UMBRELLAS = ['#c8423a', '#2b3f9e', '#e0a13a', '#34343c', '#3f7d3a', '#d86f8c'];
const PODS = ['#e9e4d8', '#c8423a', '#2b3f9e', '#3a3d46', '#8fa9bd', '#e0a13a', '#f2efe8'];

interface Person {
  walk: Walk;
  len: number;
  d: number;
  dir: 1 | -1;
  off: number;
  speed: number;
  phase: number;
  coat: string;
  legs: string;
  skin: string;
  umbrella: string;
  /** Out only when the street is at least this busy. */
  keen: number;
  here: number;
  /** Fades in at the start of each walk. */
  age: number;
  standing: boolean;
  x: number;
  y: number;
}

interface Car {
  lane: number;
  x: number;
  speed: number;
  colour: string;
  len: number;
}

interface Drone {
  cx: number;
  cy: number;
  ax: number;
  ay: number;
  f: number;
  p: number;
  x: number;
  y: number;
}

function lengthOf(path: Pt[]): number {
  let l = 0;
  for (let i = 1; i < path.length; i++) l += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
  return l;
}

function along(path: Pt[], d: number): Pt {
  for (let i = 1; i < path.length; i++) {
    const seg = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    if (d <= seg) {
      const t = d / (seg || 1);
      return [path[i - 1][0] + (path[i][0] - path[i - 1][0]) * t, path[i - 1][1] + (path[i][1] - path[i - 1][1]) * t];
    }
    d -= seg;
  }
  return path[path.length - 1];
}

/** Height of a person standing at `y`: nearer the bottom of the picture, nearer us. */
const heightAt = (y: number) => 15 + (y - 600) * 0.06;

export class Life {
  private r: Rng;
  private people: Person[] = [];
  private cars: Car[] = [];
  private drones: Drone[] = [];
  private taxi = { t: -8, period: 34 };
  private gaps = [0, 0];
  private campus: Campus;
  time = 0;

  constructor(campus: Campus, count = 38) {
    this.r = rng(1717);
    this.campus = campus;
    for (let k = 0; k < count; k++) this.people.push(this.spawn(true, k < 5));
    for (let k = 0; k < 3; k++) {
      this.drones.push({ cx: between(this.r, 300, 1300), cy: between(this.r, 230, 320), ax: between(this.r, 120, 260), ay: between(this.r, 20, 50), f: between(this.r, 0.05, 0.1), p: between(this.r, 0, 6), x: 0, y: 0 });
    }
    // The street already has traffic on it when the film begins.
    for (let lane = 0; lane < 2; lane++) for (let x = 100; x < 1500; x += between(this.r, 260, 520)) this.cars.push(this.car(lane, x));
  }

  private spawn(anywhere: boolean, standing = false): Person {
    const r = this.r;
    const walks = this.campus.walks;
    const total = walks.reduce((a, w) => a + w.weight, 0);
    let pickW = r() * total;
    let walk = walks[0];
    for (const w of walks) {
      pickW -= w.weight;
      if (pickW <= 0) {
        walk = w;
        break;
      }
    }
    const len = lengthOf(walk.path);
    const dir: 1 | -1 = r() < 0.5 ? 1 : -1;
    const t = this.campus.terrace;
    return {
      walk,
      len,
      d: anywhere ? r() * len : dir === 1 ? 0 : len,
      dir,
      off: between(r, -walk.spread, walk.spread),
      speed: between(r, 16, 26),
      phase: r() * 6.28,
      coat: pick(r, COATS),
      legs: pick(r, LEGS),
      skin: pick(r, SKIN),
      umbrella: pick(r, UMBRELLAS),
      keen: standing ? 0.3 : r(),
      here: 0,
      age: anywhere ? 5 : 0,
      standing,
      x: standing ? between(r, t.x0, t.x1) : 0,
      y: t.y + (standing ? between(r, -2, 4) : 0),
    };
  }

  private car(lane: number, x?: number): Car {
    const l = this.campus.lanes[lane];
    return {
      lane,
      x: x ?? (l.dir === 1 ? -140 : 1740),
      speed: between(this.r, 70, 120),
      colour: pick(this.r, PODS),
      len: between(this.r, 46, 60),
    };
  }

  update(dt: number, bustle: number) {
    this.time += dt;
    const r = this.r;
    for (let i = 0; i < this.people.length; i++) {
      const p = this.people[i];
      const want = p.keen <= bustle ? 1 : 0;
      p.here += clamp(want - p.here, -dt * 0.6, dt * 0.6);
      p.age += dt;
      if (p.standing) {
        p.phase += dt * 0.8;
        continue;
      }
      p.d += p.dir * p.speed * dt;
      p.phase += (p.speed * dt) / 5.2;
      if (p.d < 0 || p.d > p.len) this.people[i] = this.spawn(false);
      else {
        const [x, y] = along(p.walk.path, p.d);
        p.x = x;
        p.y = y + p.off * 0.35;
      }
    }

    const lanes = this.campus.lanes;
    for (const c of this.cars) c.x += lanes[c.lane].dir * c.speed * dt;
    this.cars = this.cars.filter((c) => c.x > -200 && c.x < 1800);
    for (let lane = 0; lane < 2; lane++) {
      this.gaps[lane] -= dt;
      if (this.gaps[lane] <= 0) {
        this.cars.push(this.car(lane));
        // A quiet street at night; nose to tail at noon.
        this.gaps[lane] = between(r, 3, 7) / Math.max(0.25, bustle);
      }
    }

    for (const d of this.drones) {
      const t = this.time * d.f * 6.28 + d.p;
      d.x = d.cx + Math.sin(t) * d.ax;
      d.y = d.cy + Math.sin(t * 2) * d.ay;
    }
    this.taxi.t += dt;
    if (this.taxi.t > this.taxi.period) this.taxi.t = -between(r, 4, 12);
  }

  /** How much of a figure at `x` shows, fading toward the ragged edges of the painting. */
  private edge(x: number) {
    return smooth(60, 160, x) * (1 - smooth(1440, 1540, x));
  }

  draw(ctx: CanvasRenderingContext2D, env: { colour: number; rain: number; snow: number; fade: number }) {
    // Painted in order of depth: the far path first, the pavement last.
    const people = this.people.slice().sort((a, b) => a.y - b.y);
    for (const p of people) {
      const a = env.fade * p.here * this.edge(p.x) * Math.min(1, p.age) * (p.walk.door && !p.standing ? smooth(p.walk.path[0][1] + 2, p.walk.path[0][1] + 18, p.y) : 1);
      if (a < 0.02) continue;
      this.person(ctx, p, a, env);
    }
    for (const c of this.cars) this.pod(ctx, c, env.colour, env.fade);
    ctx.globalAlpha = env.fade;
    for (const d of this.drones) this.drone(ctx, d.x, d.y);
    this.airTaxi(ctx);
    ctx.globalAlpha = 1;
  }

  private person(ctx: CanvasRenderingContext2D, p: Person, alpha: number, env: { colour: number; rain: number; snow: number }) {
    const h = heightAt(p.y);
    const { x, y } = p;
    const swing = p.standing ? 0 : Math.sin(p.phase);
    const bob = p.standing ? Math.sin(p.phase) * 0.2 : Math.abs(Math.cos(p.phase)) * h * 0.02;
    const hip = y - h * 0.46 - bob;
    const shoulder = y - h * 0.8 - bob;
    ctx.globalAlpha = alpha;

    // A shadow, soft, on the ground.
    ctx.fillStyle = 'rgba(60,52,78,0.16)';
    ctx.beginPath();
    ctx.ellipse(x + h * 0.08, y, h * 0.22, h * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(0.7, h * 0.06);
    ctx.strokeStyle = p.legs;
    ctx.globalAlpha = alpha * (0.35 + 0.55 * env.colour);
    ctx.beginPath();
    ctx.moveTo(x, hip);
    ctx.lineTo(x + swing * h * 0.15, y);
    ctx.moveTo(x, hip);
    ctx.lineTo(x - swing * h * 0.15, y);
    ctx.stroke();

    // The coat: a dab of colour, then the pencil round it.
    ctx.globalAlpha = alpha * env.colour * 0.9;
    ctx.fillStyle = p.coat;
    ctx.beginPath();
    ctx.moveTo(x - h * 0.1, shoulder + h * 0.02);
    ctx.quadraticCurveTo(x, shoulder - h * 0.04, x + h * 0.1, shoulder + h * 0.02);
    ctx.lineTo(x + h * 0.12, hip + h * 0.06);
    ctx.lineTo(x - h * 0.12, hip + h * 0.06);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = alpha * 0.7;
    ctx.strokeStyle = GRAPHITE;
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // Arms, swinging against the legs.
    ctx.beginPath();
    ctx.moveTo(x - h * 0.08, shoulder + h * 0.04);
    ctx.lineTo(x - h * 0.1 - swing * h * 0.1, hip + h * 0.02);
    ctx.moveTo(x + h * 0.08, shoulder + h * 0.04);
    ctx.lineTo(x + h * 0.1 + swing * h * 0.1, hip + h * 0.02);
    ctx.stroke();

    // Head.
    const hy = shoulder - h * 0.1;
    ctx.globalAlpha = alpha * (0.4 + 0.5 * env.colour);
    ctx.fillStyle = p.skin;
    ctx.beginPath();
    ctx.arc(x, hy, h * 0.075, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha * 0.75;
    ctx.stroke();

    // Umbrellas go up when it rains, hoods when it snows.
    const cover = Math.max(env.rain, env.snow * 0.6);
    if (cover > 0.15 && (p.keen > 0.25 || env.rain > 0.5)) {
      const u = smooth(0.15, 0.5, cover);
      const top = hy - h * 0.2;
      ctx.globalAlpha = alpha * u * 0.8;
      ctx.beginPath();
      ctx.moveTo(x, hy + h * 0.1);
      ctx.lineTo(x, top);
      ctx.stroke();
      ctx.fillStyle = p.umbrella;
      ctx.beginPath();
      ctx.ellipse(x, top + h * 0.06, h * 0.3 * u, h * 0.17 * u, 0, Math.PI, 0);
      ctx.closePath();
      ctx.globalAlpha = alpha * u * (0.35 + 0.5 * env.colour);
      ctx.fill();
      ctx.globalAlpha = alpha * u * 0.7;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private pod(ctx: CanvasRenderingContext2D, c: Car, colour: number, fade: number) {
    const lane = this.campus.lanes[c.lane];
    const s = lane.scale;
    const a = this.edge(c.x) * fade;
    if (a < 0.02) return;
    const L = c.len;
    const hover = 4 + Math.sin(this.time * 3 + c.x * 0.05) * 0.8;
    ctx.save();
    ctx.translate(c.x, lane.y);
    ctx.scale(lane.dir * s, s);
    ctx.globalAlpha = a * 0.22;
    ctx.fillStyle = '#3c3a4c';
    ctx.beginPath();
    ctx.ellipse(0, 0, L * 0.45, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(0, -hover);

    ctx.beginPath();
    ctx.moveTo(-L / 2, -2);
    ctx.lineTo(-L / 2 + 1, -9);
    ctx.quadraticCurveTo(-L / 2 + 4, -15, -L * 0.16, -16);
    ctx.quadraticCurveTo(L * 0.18, -17, L * 0.36, -10);
    ctx.quadraticCurveTo(L / 2 + 3, -8, L / 2, -2);
    ctx.quadraticCurveTo(0, 1, -L / 2, -2);
    ctx.closePath();
    ctx.globalAlpha = a * 0.85 * colour;
    ctx.fillStyle = c.colour;
    ctx.fill();
    ctx.globalAlpha = a * 0.8;
    ctx.strokeStyle = GRAPHITE;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-L * 0.34, -9.5);
    ctx.quadraticCurveTo(-L * 0.3, -14, -L * 0.12, -14.5);
    ctx.quadraticCurveTo(L * 0.16, -15, L * 0.3, -9.5);
    ctx.closePath();
    ctx.globalAlpha = a * 0.55;
    ctx.fillStyle = '#2d3646';
    ctx.fill();
    // The light strip along its flank.
    ctx.globalAlpha = a * 0.5;
    ctx.strokeStyle = '#f7f4ec';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-L * 0.42, -5.5);
    ctx.lineTo(L * 0.42, -5.5);
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  private drone(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.strokeStyle = GRAPHITE;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(x - 6, y);
    ctx.lineTo(x + 6, y);
    ctx.moveTo(x - 3, y + 2);
    ctx.lineTo(x - 3, y + 4);
    ctx.moveTo(x + 3, y + 2);
    ctx.lineTo(x + 3, y + 4);
    ctx.stroke();
    ctx.fillStyle = 'rgba(40,40,52,0.7)';
    ctx.fillRect(x - 2.5, y - 1, 5, 3);
    // Rotors, a blur.
    ctx.fillStyle = 'rgba(40,40,52,0.18)';
    for (const dx of [-6, 6]) {
      ctx.beginPath();
      ctx.ellipse(x + dx, y - 0.5, 4, 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private taxiAt(): Pt | null {
    const u = this.taxi.t / this.taxi.period;
    if (u < 0 || u > 1) return null;
    return [-200 + u * 2000, 250 - u * 70 + Math.sin(u * 9) * 6];
  }

  private airTaxi(ctx: CanvasRenderingContext2D) {
    const p = this.taxiAt();
    if (!p) return;
    const [x, y] = p;
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = GRAPHITE;
    ctx.lineWidth = 0.8;
    ctx.fillStyle = 'rgba(235,232,224,0.85)';
    ctx.beginPath();
    ctx.moveTo(-22, 0);
    ctx.quadraticCurveTo(-18, -8, 2, -8);
    ctx.quadraticCurveTo(20, -7, 24, 0);
    ctx.quadraticCurveTo(0, 4, -22, 0);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(45,54,70,0.6)';
    ctx.beginPath();
    ctx.moveTo(6, -7);
    ctx.quadraticCurveTo(18, -6, 21, -1);
    ctx.lineTo(6, -2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-30, -9);
    ctx.lineTo(30, -9);
    ctx.stroke();
    ctx.fillStyle = 'rgba(40,40,52,0.16)';
    for (const dx of [-30, -12, 12, 30]) {
      ctx.beginPath();
      ctx.ellipse(dx, -11, 9, 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** Lights, laid over the painting after it has been glazed for the hour. */
  lights(ctx: CanvasRenderingContext2D, night: number, t: number) {
    if (night < 0.05) return;
    const lanes = this.campus.lanes;
    for (const c of this.cars) {
      const lane = lanes[c.lane];
      const a = this.edge(c.x) * night;
      const nose = c.x + lane.dir * c.len * 0.5 * lane.scale;
      const y = lane.y - 6;
      const beam = ctx.createRadialGradient(nose, y, 0, nose + lane.dir * 40, y + 2, 60);
      beam.addColorStop(0, `rgba(255,236,190,${0.55 * a})`);
      beam.addColorStop(1, 'rgba(255,236,190,0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(nose, y - 2);
      ctx.lineTo(nose + lane.dir * 90, y - 12);
      ctx.lineTo(nose + lane.dir * 90, y + 14);
      ctx.closePath();
      ctx.fill();
      const tail = c.x - lane.dir * c.len * 0.5 * lane.scale;
      ctx.fillStyle = `rgba(255,80,70,${0.7 * a})`;
      ctx.beginPath();
      ctx.arc(tail, y, 1.8, 0, Math.PI * 2);
      ctx.fill();
      // The pod's underglow on the road.
      const glow = ctx.createRadialGradient(c.x, lane.y, 0, c.x, lane.y, c.len * 0.5);
      glow.addColorStop(0, `rgba(120,230,255,${0.35 * a})`);
      glow.addColorStop(1, 'rgba(120,230,255,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(c.x - c.len * 0.5, lane.y - 8, c.len, 16);
    }
    const blink = (Math.sin(t * 6) > 0.6 ? 1 : 0.15) * night;
    for (const d of this.drones) {
      ctx.fillStyle = `rgba(255,70,60,${blink})`;
      ctx.beginPath();
      ctx.arc(d.x - 6, d.y, 1.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(110,255,140,${blink})`;
      ctx.beginPath();
      ctx.arc(d.x + 6, d.y, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
    const p = this.taxiAt();
    if (p) {
      const g = ctx.createRadialGradient(p[0], p[1] + 2, 0, p[0], p[1] + 2, 26);
      g.addColorStop(0, `rgba(170,230,255,${0.5 * night})`);
      g.addColorStop(1, 'rgba(170,230,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(p[0] - 26, p[1] - 24, 52, 52);
      ctx.fillStyle = `rgba(255,255,255,${blink})`;
      ctx.beginPath();
      ctx.arc(p[0] + 24, p[1], 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
