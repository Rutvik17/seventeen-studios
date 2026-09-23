/**
 * Chapter three: Newton's cannon. Holding the button loads it — faster the
 * longer it is held — and the drawing shows where a throw at that speed would
 * go before it is fired. Letting go fires it.
 */

import { orbitCopy as copy } from '@/content/rocket';
import { CANNON } from '../crafts';
import { EARTH, circleSpeedAt, distanceFromCentre, escapeSpeedAt, gravityAt } from '../physics';
import { PATH_STEP, angleOf, heightOf, outcomeOf, path, step, thrown, type Body, type Outcome } from '../orbit';
import { drawGlobeBackdrop, drawGlobeStill, drawShot, globeLayout, type GlobeLayout } from '../globe';
import * as fmt from '../format';
import type { Chapter, Sound } from './chapter';

type Mode = 'ready' | 'loading' | 'flying' | 'landed' | 'orbiting' | 'gone';

/** Longest simulated step while flying, seconds. */
const MAX_STEP = 2;

export function createOrbit(): Chapter {
  const h = CANNON.height;
  const r = distanceFromCentre(h);
  const g = gravityAt(h);
  let L: GlobeLayout = globeLayout(1, 1, h);
  let mode: Mode = 'ready';
  let speed = 0;
  let aim: { points: Body[]; kind: Outcome['kind']; lands: number } | null = null;
  let aimedAt = -1;
  let outcome: Outcome = outcomeOf(h, 0);
  let body: Body | null = null;
  let trail: Body[] = [];
  let flown = 0;
  let sinceTrail = 0;
  let landed = 0;
  let clock = 0;
  let firedAt: number | null = null;
  let impact: { at: Body; since: number } | null = null;

  /** How far round the Earth a path ends, metres along the ground. */
  const around = (b: Body) => EARTH.radius * angleOf(b);

  function reaim() {
    const p = path(h, speed, L.reach);
    aim = { points: p.points, kind: outcomeOf(h, speed).kind, lands: p.lands ? around(p.points[p.points.length - 1]) : 0 };
    aimedAt = speed;
  }

  function where(): string {
    const o = outcomeOf(h, speed);
    if (o.kind === 'orbits') return copy.working.orbits(fmt.duration(o.period));
    if (o.kind === 'escapes') return copy.working.escapes;
    const lands = mode === 'landed' ? landed : aim?.lands ?? 0;
    return copy.working.lands(fmt.distance(lands));
  }

  return {
    lines: [
      { key: 'speed', label: copy.working.speed, tone: 'push' },
      { key: 'circle', label: copy.working.circle },
      { key: 'escape', label: copy.working.escape, tone: 'escape' },
      { key: 'where', label: copy.working.where },
    ],

    step(dt, input) {
      clock += dt;
      const sounds: Sound[] = [];
      if (input.pressed) {
        mode = 'loading';
        speed = 0;
        body = null;
        trail = [];
        impact = null;
        firedAt = null;
        reaim();
      }

      if (mode === 'loading') {
        if (input.held) speed = Math.min(CANNON.topSpeed, speed + (CANNON.topSpeed / CANNON.loadSeconds) * dt);
        if (Math.abs(speed - aimedAt) > 10) reaim();
        if (!input.held) {
          mode = 'flying';
          outcome = outcomeOf(h, speed);
          body = thrown(h, speed);
          trail = [body];
          flown = 0;
          sinceTrail = 0;
          firedAt = clock;
          sounds.push('clunk');
        }
      }

      if (body && (mode === 'flying' || mode === 'orbiting')) {
        let left = dt * CANNON.timeScale;
        while (left > 0 && body) {
          const d = Math.min(MAX_STEP, left);
          left -= d;
          body = step(body, d);
          flown += d;
          sinceTrail += d;
          if (sinceTrail >= PATH_STEP) {
            sinceTrail = 0;
            trail.push(body);
            // Once round, the trail is the whole orbit: keep one lap of it.
            if (outcome.kind === 'orbits' && trail.length > outcome.period / PATH_STEP + 2) trail.shift();
          }
          if (heightOf(body) <= 0) {
            const k = EARTH.radius / Math.hypot(body.x, body.y);
            const at = { ...body, x: body.x * k, y: body.y * k };
            mode = 'landed';
            landed = around(at);
            impact = { at, since: 0 };
            trail.push(at);
            body = null;
            sounds.push('thud');
          } else if (outcome.kind === 'orbits' && mode === 'flying' && flown >= outcome.period) {
            mode = 'orbiting';
            sounds.push('chime');
          } else if (outcome.kind === 'escapes' && Math.hypot(body.x, body.y) > L.reach) {
            mode = 'gone';
            body = null;
            sounds.push('chime');
          }
        }
      }
      if (impact) impact.since += dt;
      return sounds;
    },

    status() {
      switch (mode) {
        case 'ready':
          return copy.status.ready(fmt.altitude(h));
        case 'loading':
          return copy.status[aim?.kind ?? 'falls'];
        case 'flying':
          return outcome.kind === 'falls' ? copy.status.flying : outcome.kind === 'escapes' ? copy.status.leaving : copy.status.orbits;
        case 'landed':
          return copy.status.landed(fmt.distance(landed));
        case 'orbiting':
          return copy.status.orbiting(fmt.duration(outcome.kind === 'orbits' ? outcome.period : 0));
        case 'gone':
          return copy.status.escaped;
      }
    },

    button: () => (mode === 'loading' ? copy.release : copy.button),

    working() {
      return {
        speed: fmt.speed(speed),
        circle: `√(${fmt.gravity(g)} × ${fmt.metres(r)}) = ${fmt.speed(circleSpeedAt(h))}`,
        escape: `√(2 × ${fmt.gravity(g)} × ${fmt.metres(r)}) = ${fmt.speed(escapeSpeedAt(h))}`,
        where: where(),
      };
    },

    engine: () => 0,

    resize(w, hh) {
      L = globeLayout(w, hh, h);
      if (mode === 'loading') reaim();
    },
    backdrop: (ctx, pal) => drawGlobeBackdrop(ctx, L, pal),
    still: (ctx, pal, seed) => drawGlobeStill(ctx, L, pal, seed, { ring: copy.ring(fmt.altitude(h)), cannon: copy.cannon }),

    moment(ctx, pal, frame) {
      drawShot(ctx, L, pal, {
        aim: mode === 'loading' && aim ? aim : null,
        trail,
        ball: body,
        impact,
        sinceFire: firedAt === null || frame.reduced ? null : clock - firedAt,
        seed: frame.seed,
      });
    },
  };
}
