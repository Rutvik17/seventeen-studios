/**
 * The whole trip, flown once: from the pad to the Moon, and the booster home.
 *
 * `flyMission()` is pure and deterministic. It returns what the ship and the
 * booster did, sampled over time, the moments that matter, and the facts the
 * page prints — all from the physics in this folder. The page plays it back;
 * `scripts/verify-rocket.mjs` checks it against what real flights did.
 *
 * ---
 *
 * THE STEPS, AND WHAT EACH IS MODELLED ON
 *
 * 1. Climb: straight up, a small tip east after 8 s, then the "gravity
 *    turn" — the rocket points along its own path and gravity bends it over.
 *    Full power for a minute, then throttled so the booster reaches its
 *    reserve at T+2:40, where Starship's boosters separate (Flight 5).
 * 2. Separation: the booster keeps a reserve for the trip home; the ship
 *    lights its own engines ("hot staging").
 * 3. Booster home: it flips, fires back towards the pad until its predicted
 *    fall point is the pad ("boostback"), falls engines first through the air
 *    (which slows it hard), steers with its grid fins, fires again to stop
 *    beside the tower, slides sideways into line, and is caught by the arms.
 * 4. Ship to orbit: steering that plans ahead to arrive level at 200 km just
 *    as it reaches circling speed; the engine cuts out there.
 * 5. Refuel: a tanker docks and fills the tanks (planned for Starship's Moon
 *    lander; not yet flown).
 * 6. Moon burn: along the direction of flight until the speed is just short
 *    of escape speed. The Moon's place is chosen so the ship swings round its
 *    far side ~100 km up, as Apollo 11 did.
 * 7. Coast: about three days, the Earth and the Moon both pulling.
 * 8. Moon orbit: a braking burn at the closest point, down to the speed that
 *    circles the Moon there.
 * 9. Landing: a small burn one lap later to dip to 15 km, then a powered
 *    descent steered to a spot ~12 minutes away (Apollo 11's lasted 756 s),
 *    ending straight down and slow.
 *
 * Kept simple: a flat slice through space; no spin of the Earth or Moon; the
 * ship's engines throttle as low as they need to.
 */

import { EARTH, GM, MOON, MOON_GM, airDensity, heightAt, moonAt } from './bodies';
import { COAST, frame, step, type Craft, type Push } from './integrate';
import { AREA, BOOSTER, DRAG, SHIP } from './vehicle';

/* ------------------------------------------------------------------ *
 * The flight plan's settings
 * ------------------------------------------------------------------ */

export const PLAN = {
  /** Straight up for this long, s, then tip east. */
  riseFor: 8,
  /** How far it tips over, radians, over the next 10 s. */
  kick: (4.5 * Math.PI) / 180,
  /** Full power for this long, s; then throttled to separate on time. */
  fullFor: 60,
  /** Separation, s after lift-off. */
  separation: 160,
  /** What the booster keeps for the trip home, kg. */
  reserve: 550_000,
  /** Seconds the booster coasts while it flips. */
  flip: 5,
  /** Boostback: share of full power, and how far the push is tipped up, radians. */
  boostback: { throttle: 0.39, tipUp: (12 * Math.PI) / 180 },
  /** Landing burn: share of full power at most. */
  landing: { throttle: 0.39, margin: 400 },
  /** How high the booster's base is held when the arms close, m. */
  catchHeight: 30,
  /** Grid fins: the sideways push they can give, m/s², at full air pressure. */
  fins: 6,
  /** Target orbit height, m. */
  orbit: 200_000,
  /** The ship throttles back to keep its push under this many g as its tanks empty. */
  gLimit: 4,
  /** Minutes in orbit before the tanker docks, and while it fills the tanks. */
  dockAfter: 45 * 60,
  refuelFor: 90 * 60,
  /** Speed the Moon burn stops at, m/s: just under escape speed from 200 km. */
  moonBurnTo: 10_880,
  /** Height of the closest pass over the Moon, m. */
  perilune: 100_000,
  /** Lowest point after the dip, before the powered descent, m. */
  dipTo: 15_000,
  /** Seconds the powered descent is steered to take. */
  descentFor: 740,
  /** Final approach: straight down at this speed below this height. */
  finalSpeed: 1.5,
  finalBelow: 60,
} as const;

/* ------------------------------------------------------------------ *
 * What comes out
 * ------------------------------------------------------------------ */

export type Sample = {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** kg on board */
  m: number;
  /** Share of full power, 0–1 */
  throttle: number;
  /** Which way the nose points, radians (the angle of the unit vector (sin a, cos a): 0 is straight up from the top of the Earth). */
  nose: number;
};

export type EventId =
  | 'liftoff'
  | 'separation'
  | 'boostback'
  | 'boostbackEnd'
  | 'landingBurn'
  | 'caught'
  | 'orbit'
  | 'docked'
  | 'refuelled'
  | 'moonBurn'
  | 'moonBurnEnd'
  | 'perilune'
  | 'moonOrbit'
  | 'dip'
  | 'descent'
  | 'touchdown';

export type Mission = {
  ship: Sample[];
  booster: Sample[];
  /** The Moon's starting place, radians clockwise from the top. */
  moonPhase: number;
  events: Record<EventId, number>;
  /** Where the ship landed, relative to the Moon's centre, metres. */
  site: { x: number; y: number };
  facts: {
    separation: { h: number; v: number };
    caught: { miss: number; speed: number; fuelLeft: number };
    orbit: { h: number; v: number; low: number; high: number; fuelLeft: number };
    moonBurn: { v: number; escape: number };
    moonOrbit: { low: number; high: number; period: number };
    touchdown: { speed: number; fuelLeft: number };
  };
  end: number;
};

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

const noseOf = (ux: number, uy: number) => Math.atan2(ux, uy);
const DOWNRANGE = (c: { x: number; y: number }) => Math.atan2(c.x, c.y) * EARTH.radius;

function recorder() {
  const track: Sample[] = [];
  let last = -Infinity;
  return {
    track,
    /** Keeps a sample if `every` seconds have passed, or always when forced. */
    add(t: number, c: Craft, throttle: number, nose: number, every: number, force = false) {
      if (!force && t - last < every) return;
      last = t;
      track.push({ t, x: c.x, y: c.y, vx: c.vx, vy: c.vy, m: c.m, throttle, nose });
    },
  };
}

/** Where a coasting booster would hit the ground, metres downrange. */
function fallPoint(c: Craft): number {
  let p = c;
  const drag: Push = { ...COAST, cda: DRAG.enginesFirst * AREA };
  for (let i = 0; i < 4000; i += 1) {
    p = step(p, 0.5, drag);
    if (heightAt(p.x, p.y) <= 0) break;
  }
  return DOWNRANGE(p);
}

/**
 * Seconds for the next step of a coast with the Moon nearby: long far out,
 * short close in, so the pass over the Moon is followed a few kilometres at a
 * time.
 */
function coastStep(c: Craft, m: { x: number; y: number; vx: number; vy: number }): number {
  const d = Math.hypot(c.x - m.x, c.y - m.y);
  const v = Math.hypot(c.vx - m.vx, c.vy - m.vy);
  return Math.max(0.5, Math.min(60, d / (v * 300)));
}

/**
 * How high a falling booster would come to a stop if it lit its engines at
 * full landing power now, with the air helping to slow it, metres.
 */
function stopsAt(c: Craft): number {
  let p = c;
  const most = BOOSTER.thrust * PLAN.landing.throttle;
  for (let i = 0; i < 2000; i += 1) {
    const f = frame(p);
    if (p.vx * f.ux + p.vy * f.uy >= 0) break;
    p = step(p, 0.1, { thrust: most, ux: f.ux, uy: f.uy, exhaust: BOOSTER.exhaust, cda: DRAG.enginesFirst * AREA });
  }
  return heightAt(p.x, p.y);
}

function orbitShape(c: Craft, gm: number, cx = 0, cy = 0, cvx = 0, cvy = 0) {
  const x = c.x - cx;
  const y = c.y - cy;
  const vx = c.vx - cvx;
  const vy = c.vy - cvy;
  const r = Math.hypot(x, y);
  const a = 1 / (2 / r - (vx * vx + vy * vy) / gm);
  const h = x * vy - y * vx;
  const e = Math.sqrt(Math.max(0, 1 - (h * h) / (gm * a)));
  return { low: a * (1 - e), high: a * (1 + e), period: 2 * Math.PI * Math.sqrt((a * a * a) / gm) };
}

/* ------------------------------------------------------------------ *
 * The flight
 * ------------------------------------------------------------------ */

const DT = 0.05;

export function flyMission(): Mission {
  const events = {} as Record<EventId, number>;
  const ship = recorder();
  const booster = recorder();

  /* ---- 1. the climb, as one stack ---- */
  let c: Craft = { x: 0, y: EARTH.radius, vx: 0, vy: 0, m: BOOSTER.dry + BOOSTER.fuel + SHIP.dry + SHIP.fuel };
  const perSecond = BOOSTER.thrust / BOOSTER.exhaust;
  const later = (BOOSTER.fuel - PLAN.reserve - perSecond * PLAN.fullFor) / (perSecond * (PLAN.separation - PLAN.fullFor));
  let t = 0;
  events.liftoff = 0;
  while (t < PLAN.separation - 1e-9) {
    const f = frame(c);
    const v = Math.hypot(c.vx, c.vy);
    let ux = f.ux;
    let uy = f.uy;
    if (t > PLAN.riseFor) {
      if (t < PLAN.riseFor + 10) {
        const a = (PLAN.kick * (t - PLAN.riseFor)) / 10;
        ux = Math.cos(a) * f.ux + Math.sin(a) * f.ex;
        uy = Math.cos(a) * f.uy + Math.sin(a) * f.ey;
      } else {
        ux = c.vx / v;
        uy = c.vy / v;
      }
    }
    const throttle = t < PLAN.fullFor ? 1 : later;
    ship.add(t, c, throttle, noseOf(ux, uy), 0.25, t === 0);
    booster.add(t, c, throttle, noseOf(ux, uy), 0.25, t === 0);
    c = step(c, DT, { thrust: BOOSTER.thrust * throttle, ux, uy, exhaust: BOOSTER.exhaust, cda: DRAG.noseFirst * AREA });
    t += DT;
  }
  events.separation = t;
  const atSeparation = c;
  const sep = { h: heightAt(c.x, c.y), v: Math.hypot(c.vx, c.vy) };

  /* ---- 3. the booster, home ---- */
  let caught: Mission['facts']['caught'];
  {
    let b: Craft = { ...atSeparation, m: BOOSTER.dry + PLAN.reserve };
    let tb = t;
    const cda = DRAG.enginesFirst * AREA;
    const noseStart = noseOf(atSeparation.vx, atSeparation.vy);
    booster.add(tb, b, 0, noseStart, 0, true);
    // The flip: a coast while it turns round.
    while (tb < t + PLAN.flip) {
      const f = frame(b);
      const back = noseOf(-f.ex, -f.ey);
      const u = (tb - t) / PLAN.flip;
      b = step(b, DT, { ...COAST, cda });
      tb += DT;
      booster.add(tb, b, 0, noseStart + (back - noseStart - 2 * Math.PI) * u, 0.1);
    }
    // Boostback, until the fall point is the pad.
    events.boostback = tb;
    let fall = fallPoint(b);
    while (fall > 0) {
      const f = frame(b);
      const a = PLAN.boostback.tipUp;
      const ux = -Math.cos(a) * f.ex + Math.sin(a) * f.ux;
      const uy = -Math.cos(a) * f.ey + Math.sin(a) * f.uy;
      b = step(b, DT, { thrust: BOOSTER.thrust * PLAN.boostback.throttle, ux, uy, exhaust: BOOSTER.exhaust, cda });
      tb += DT;
      booster.add(tb, b, PLAN.boostback.throttle, noseOf(ux, uy), 0.1);
      fall = fallPoint(b);
    }
    events.boostbackEnd = tb;
    // Falling home, then the landing burn, then the slide into the arms.
    let burning = false;
    let settled = 0;
    for (let i = 0; i < 40_000; i += 1) {
      const f = frame(b);
      const r = Math.hypot(b.x, b.y);
      const h = r - EARTH.radius;
      const vr = b.vx * f.ux + b.vy * f.uy;
      const vt = b.vx * f.ex + b.vy * f.ey;
      const g = GM / (r * r);
      const x = DOWNRANGE(b);
      const above = h - PLAN.catchHeight;
      const most = (BOOSTER.thrust * PLAN.landing.throttle) / b.m - g;
      // Light up at the last moment that still stops it above the arms: the
      // air does much of the slowing, so the burn can wait.
      if (!burning && vr < 0 && above < 30_000 && i % 5 === 0 && stopsAt(b) <= PLAN.catchHeight + PLAN.landing.margin) {
        burning = true;
        events.landingBurn = tb;
      }
      // Sideways: steer to arrive over the pad ("zero-effort miss"). It comes
      // in at a slant, as real boosters do, and the landing burn takes out
      // the sideways speed.
      const tgo = vr < -1 ? Math.max(1, ((burning ? 2 : 1) * Math.max(1, above)) / -vr) : 30;
      const side = (-2 * (x + vt * tgo)) / (tgo * tgo);
      if (burning) {
        if (above <= 0.5 && Math.abs(vr) < 0.5 && Math.abs(vt) < 0.3 && Math.abs(x) < 0.5) {
          settled += DT;
          if (settled > 1) break;
        }
        // Hold the catch height and slide into line: a hover once there.
        const up = above > 2 ? Math.max(0, (vr * vr) / (2 * Math.max(0.5, above)) + g) : g - 1.5 * vr - 0.4 * above;
        const sideA = Math.max(-0.6 * most, Math.min(0.6 * most, above > 2 ? side : -0.8 * vt - 0.25 * x));
        const acc = Math.hypot(up, sideA);
        const thrust = Math.min(BOOSTER.thrust * PLAN.landing.throttle, acc * b.m);
        const ux = (up * f.ux + sideA * f.ex) / acc;
        const uy = (up * f.uy + sideA * f.ey) / acc;
        b = step(b, DT, { thrust, ux, uy, exhaust: BOOSTER.exhaust, cda });
        booster.add(tb + DT, b, thrust / BOOSTER.thrust, noseOf(ux, uy), 0.1);
      } else {
        // Grid fins: a sideways push from the air, only where there is air to push on.
        const q = 0.5 * airDensity(h) * (vr * vr + vt * vt);
        const most = PLAN.fins * Math.min(1, q / 20_000);
        const s = Math.max(-most, Math.min(most, side));
        b = step(b, DT, { thrust: s * b.m, ux: f.ex, uy: f.ey, exhaust: Infinity, cda });
        // Engines first, nose up: it falls tail-first.
        booster.add(tb + DT, b, 0, noseOf(f.ux, f.uy), 0.25);
      }
      tb += DT;
    }
    events.caught = tb;
    const f = frame(b);
    booster.add(tb, b, 0, noseOf(f.ux, f.uy), 0, true);
    caught = {
      miss: Math.hypot(DOWNRANGE(b), heightAt(b.x, b.y) - PLAN.catchHeight),
      speed: Math.hypot(b.vx, b.vy),
      fuelLeft: b.m - BOOSTER.dry,
    };
  }

  /* ---- 4. the ship, to orbit ---- */
  c = { ...atSeparation, m: SHIP.dry + SHIP.fuel };
  let pitch = 0.5;
  for (;;) {
    const f = frame(c);
    const r = Math.hypot(c.x, c.y);
    const vr = c.vx * f.ux + c.vy * f.uy;
    const vt = c.vx * f.ex + c.vy * f.ey;
    const vc = Math.sqrt(GM / r);
    if (vt >= vc) break;
    const h = r - EARTH.radius;
    const thrust = Math.min(SHIP.thrust, PLAN.gLimit * EARTH.g0 * c.m);
    const aT = thrust / c.m;
    const tgo = Math.max(1, (vc - vt) / aT);
    // Plan ahead: the upward push that arrives at the target height with no
    // upward speed left, just as the sideways speed reaches circling speed.
    if (tgo > 2) {
      const want = (6 * (PLAN.orbit - h) - 4 * vr * tgo) / (tgo * tgo);
      pitch = Math.max(-0.5, Math.min(0.95, (want + GM / (r * r) - (vt * vt) / r) / aT));
    }
    const across = Math.sqrt(1 - pitch * pitch);
    const ux = pitch * f.ux + across * f.ex;
    const uy = pitch * f.uy + across * f.ey;
    ship.add(t, c, thrust / SHIP.thrust, noseOf(ux, uy), 0.25);
    c = step(c, DT, { thrust, ux, uy, exhaust: SHIP.exhaust, cda: DRAG.noseFirst * AREA });
    t += DT;
  }
  events.orbit = t;
  const leo = orbitShape(c, GM);
  const orbitFacts = { h: heightAt(c.x, c.y), v: Math.hypot(c.vx, c.vy), low: leo.low - EARTH.radius, high: leo.high - EARTH.radius, fuelLeft: c.m - SHIP.dry };

  const coastTo = (until: number, every: number, moonPhase: number | null) => {
    while (t < until) {
      const d = Math.min(every / 4, until - t, 10);
      const moon = moonPhase === null ? null : moonAt(t, moonPhase);
      c = step(c, d, COAST, moon);
      t += d;
      const v = Math.hypot(c.vx, c.vy);
      ship.add(t, c, 0, noseOf(c.vx / v, c.vy / v), every);
    }
  };

  /* ---- 5. refuel ---- */
  coastTo(events.orbit + PLAN.dockAfter, 5, null);
  events.docked = t;
  const empty = c.m;
  const refuelFrom = t;
  while (t < refuelFrom + PLAN.refuelFor) {
    const d = Math.min(2.5, refuelFrom + PLAN.refuelFor - t);
    c = step(c, d, COAST);
    t += d;
    // The tanks fill steadily while docked.
    c.m = empty + ((SHIP.dry + SHIP.fuel - empty) * (t - refuelFrom)) / PLAN.refuelFor;
    const v = Math.hypot(c.vx, c.vy);
    ship.add(t, c, 0, noseOf(c.vx / v, c.vy / v), 5);
  }
  events.refuelled = t;

  /* ---- 6. the Moon burn: where must the Moon be? ---- */
  const beforeBurn = { c: { ...c }, t };
  const burn = (from: Craft, t0: number, record: boolean) => {
    let s = from;
    let tt = t0;
    while (Math.hypot(s.vx, s.vy) < PLAN.moonBurnTo) {
      const v = Math.hypot(s.vx, s.vy);
      if (record) ship.add(tt, s, 1, noseOf(s.vx / v, s.vy / v), 0.5);
      s = step(s, 0.5, { thrust: SHIP.thrust, ux: s.vx / v, uy: s.vy / v, exhaust: SHIP.exhaust, cda: 0 });
      tt += 0.5;
    }
    return { s, tt };
  };
  const afterBurn = burn(beforeBurn.c, beforeBurn.t, false);

  // Where the ship crosses the Moon's orbit, flying under the Earth alone.
  let probe = afterBurn.s;
  let tp = afterBurn.tt;
  while (Math.hypot(probe.x, probe.y) < MOON.distance && tp < afterBurn.tt + 8 * 86_400) {
    probe = step(probe, 60, COAST);
    tp += 60;
  }
  const w = (2 * Math.PI) / MOON.period;
  const crossing = Math.atan2(probe.x, probe.y);

  /** Closest pass over the Moon with it placed `offset` radians from the crossing: height, and whether it is the far side. */
  const pass = (offset: number) => {
    const phase = crossing + offset - w * tp;
    let s = afterBurn.s;
    let tt = afterBurn.tt;
    let best = Infinity;
    let far = false;
    while (tt < afterBurn.tt + 6 * 86_400) {
      const m = moonAt(tt, phase);
      const d = Math.hypot(s.x - m.x, s.y - m.y);
      if (d < best) {
        best = d;
        far = (s.x - m.x) * m.x + (s.y - m.y) * m.y > 0;
      } else if (best < 3e7 && d > best * 1.5) break;
      if (d < MOON.radius) {
        best = d;
        break;
      }
      const dt = coastStep(s, m);
      s = step(s, dt, COAST, m);
      tt += dt;
    }
    return { height: best - MOON.radius, far, phase };
  };
  // Scan for the far-side pass, then close in on the one ~100 km up.
  let lo = NaN;
  let hi = NaN;
  for (let o = -0.06; o <= 0.06; o += 0.0025) {
    const p = pass(o);
    if (!p.far) continue;
    if (p.height > PLAN.perilune) lo = o;
    else if (!Number.isNaN(lo)) {
      hi = o;
      break;
    }
  }
  if (Number.isNaN(lo) || Number.isNaN(hi)) throw new Error('No path found that passes behind the Moon');
  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2;
    const p = pass(mid);
    if (p.far && p.height > PLAN.perilune) lo = mid;
    else hi = mid;
  }
  const moonPhase = pass((lo + hi) / 2).phase;

  // Now fly it for real.
  events.moonBurn = t;
  const flown = burn(beforeBurn.c, beforeBurn.t, true);
  c = flown.s;
  t = flown.tt;
  events.moonBurnEnd = t;
  const moonBurnFacts = { v: Math.hypot(c.vx, c.vy), escape: Math.sqrt((2 * GM) / Math.hypot(c.x, c.y)) };

  /* ---- 7. three days out, to the closest point ---- */
  let best = Infinity;
  for (;;) {
    const m = moonAt(t, moonPhase);
    const d = Math.hypot(c.x - m.x, c.y - m.y);
    if (d > best) break;
    best = d;
    const dt = coastStep(c, m);
    c = step(c, dt, COAST, m);
    t += dt;
    const v = Math.hypot(c.vx - m.vx, c.vy - m.vy);
    ship.add(t, c, 0, noseOf((c.vx - m.vx) / v, (c.vy - m.vy) / v), d > 5e7 ? 600 : 20);
  }
  events.perilune = t;

  /* ---- 8. into Moon orbit ---- */
  const aroundMoon = () => {
    const m = moonAt(t, moonPhase);
    return { m, rx: c.x - m.x, ry: c.y - m.y, vx: c.vx - m.vx, vy: c.vy - m.vy };
  };
  for (;;) {
    const { m, rx, ry, vx, vy } = aroundMoon();
    const r = Math.hypot(rx, ry);
    const v = Math.hypot(vx, vy);
    if (v <= Math.sqrt(MOON_GM / r)) break;
    ship.add(t, c, 1, noseOf(-vx / v, -vy / v), 0.5);
    c = step(c, 0.25, { thrust: SHIP.thrust, ux: -vx / v, uy: -vy / v, exhaust: SHIP.exhaust, cda: 0 }, m);
    t += 0.25;
  }
  events.moonOrbit = t;
  const moonOrbitShape = (() => {
    const { m } = aroundMoon();
    return orbitShape(c, MOON_GM, m.x, m.y, m.vx, m.vy);
  })();

  /* ---- 9. round to the high point, the dip, and the powered descent ---- */
  const lap = moonOrbitShape.period;
  /** Coasts round the Moon until `done(r, rising, elapsed)` says stop. */
  const coastMoon = (done: (r: number, rising: boolean, elapsed: number) => boolean) => {
    const from = t;
    let last = Math.hypot(aroundMoon().rx, aroundMoon().ry);
    for (;;) {
      const m = moonAt(t, moonPhase);
      c = step(c, 2, COAST, m);
      t += 2;
      const { rx, ry, vx, vy } = aroundMoon();
      const r = Math.hypot(rx, ry);
      const v = Math.hypot(vx, vy);
      ship.add(t, c, 0, noseOf(vx / v, vy / v), 20);
      const rising = r > last;
      last = r;
      if (done(r, rising, t - from)) break;
    }
  };
  // Most of a lap, to the high point: the far side of the orbit from there is where the descent begins.
  {
    let wasRising = false;
    coastMoon((_, rising, elapsed) => {
      const peak = wasRising && !rising && elapsed > lap * 0.5;
      wasRising = rising;
      return peak;
    });
  }
  // The dip: slow down a touch, so the far side of the orbit is 15 km up.
  events.dip = t;
  for (;;) {
    const { m, rx, ry, vx, vy } = aroundMoon();
    const r = Math.hypot(rx, ry);
    const v = Math.hypot(vx, vy);
    const low = MOON.radius + PLAN.dipTo;
    const want = Math.sqrt((2 * MOON_GM * low) / (r * (r + low)));
    if (v <= want) break;
    ship.add(t, c, 0.1, noseOf(-vx / v, -vy / v), 0.5);
    c = step(c, 0.25, { thrust: SHIP.thrust * 0.1, ux: -vx / v, uy: -vy / v, exhaust: SHIP.exhaust, cda: 0 }, m);
    t += 0.25;
  }
  // Half a lap, down to the low point.
  coastMoon((_, rising, elapsed) => rising && elapsed > lap * 0.3);
  events.descent = t;

  // Powered descent: steer to a spot on the ground, arriving in `descentFor`
  // seconds with no speed left ("zero-effort miss and velocity" steering,
  // the same idea as Apollo's), then straight down, slowly, to touch down.
  const { rx: sx, ry: sy, vx: svx, vy: svy } = aroundMoon();
  const dir = Math.sign(sx * svy - sy * svx) || 1; // which way round it is going
  const range = (Math.hypot(svx, svy) * PLAN.descentFor) / 2.1;
  const siteAngle = Math.atan2(sx, sy) - (dir * range) / MOON.radius;
  const site = { x: MOON.radius * Math.sin(siteAngle), y: MOON.radius * Math.cos(siteAngle) };
  const land = t + PLAN.descentFor;
  for (let i = 0; i < 200_000; i += 1) {
    const { m, rx, ry, vx, vy } = aroundMoon();
    const r = Math.hypot(rx, ry);
    const h = r - MOON.radius;
    const up = { x: rx / r, y: ry / r };
    const gx = (-MOON_GM * rx) / (r * r * r);
    const gy = (-MOON_GM * ry) / (r * r * r);
    // What the engine must add, on top of gravity.
    let ax: number;
    let ay: number;
    if (h > PLAN.finalBelow + 3) {
      const tgo = Math.max(5, land - t);
      // Aim a little above the site, so the last stretch is straight down.
      const tx = site.x + up.x * PLAN.finalBelow;
      const ty = site.y + up.y * PLAN.finalBelow;
      const zemx = tx - (rx + vx * tgo + 0.5 * gx * tgo * tgo);
      const zemy = ty - (ry + vy * tgo + 0.5 * gy * tgo * tgo);
      const zevx = -up.x * PLAN.finalSpeed - (vx + gx * tgo);
      const zevy = -up.y * PLAN.finalSpeed - (vy + gy * tgo);
      ax = (6 * zemx) / (tgo * tgo) - (2 * zevx) / tgo;
      ay = (6 * zemy) / (tgo * tgo) - (2 * zevy) / tgo;
    } else {
      // The last metres: hold gravity off, keep a slow straight-down speed, no sideways drift.
      const vUp = vx * up.x + vy * up.y;
      const driftX = vx - vUp * up.x;
      const driftY = vy - vUp * up.y;
      const k = 1.2;
      ax = -gx - k * (vUp + PLAN.finalSpeed) * up.x - k * driftX;
      ay = -gy - k * (vUp + PLAN.finalSpeed) * up.y - k * driftY;
    }
    const need = Math.hypot(ax, ay);
    const thrust = c.m > SHIP.dry ? Math.min(SHIP.thrust, need * c.m) : 0;
    const ux = need > 0 ? ax / need : up.x;
    const uy = need > 0 ? ay / need : up.y;
    ship.add(t, c, thrust / SHIP.thrust, noseOf(ux, uy), h < 2000 ? 0.1 : 0.5);
    c = step(c, 0.1, { thrust, ux, uy, exhaust: SHIP.exhaust, cda: 0 }, m);
    t += 0.1;
    const after = aroundMoon();
    if (Math.hypot(after.rx, after.ry) <= MOON.radius) break;
  }
  events.touchdown = t;
  const { m: moonNow, rx: lx, ry: ly, vx: lvx, vy: lvy } = aroundMoon();
  const landedAt = { x: (lx / Math.hypot(lx, ly)) * MOON.radius, y: (ly / Math.hypot(lx, ly)) * MOON.radius };
  const touchdownFacts = { speed: Math.hypot(lvx, lvy), fuelLeft: c.m - SHIP.dry };
  // It stays put on the Moon from here.
  c = { x: moonNow.x + landedAt.x, y: moonNow.y + landedAt.y, vx: moonNow.vx, vy: moonNow.vy, m: c.m };
  ship.add(t, c, 0, noseOf(landedAt.x / MOON.radius, landedAt.y / MOON.radius), 0, true);
  const end = t + 60;

  return {
    ship: ship.track,
    booster: booster.track,
    moonPhase,
    events,
    site: landedAt,
    facts: {
      separation: sep,
      caught,
      orbit: orbitFacts,
      moonBurn: moonBurnFacts,
      moonOrbit: { low: moonOrbitShape.low - MOON.radius, high: moonOrbitShape.high - MOON.radius, period: moonOrbitShape.period },
      touchdown: touchdownFacts,
    },
    end,
  };
}
