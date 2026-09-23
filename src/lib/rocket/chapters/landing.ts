/**
 * Chapter four: a booster coming home. The first press drops it; after that,
 * holding fires the engine. It can slow the booster but not hold it still, so
 * the reader has to time the burn — and the working shows the one number that
 * makes that possible: the distance it needs to stop, beside its height.
 */

import { landingCopy as copy, rocketCopy } from '@/content/rocket';
import { BOOSTER as craft, BOOSTER_DROP as drop, SOFT_LANDING } from '../crafts';
import { advance, gravityAt, hasFuel, inTheAir, massOf, thrustOf, weightOf, type Flight } from '../physics';
import { drawBackdrop, drawMoment, drawStill, heightToY, layoutFor, type SkyConfig } from '../sky';
import * as fmt from '../format';
import { motionLine, netLine, weightLine } from './lines';
import type { Chapter, Sound } from './chapter';

const SKY: SkyConfig = {
  // Evenly spread for the last 50 metres, where the landing is won or lost.
  scale: { knee: 50, top: 10_000 },
  ruler: [10, 100, 1_000],
  landmarks: [],
  clouds: [700, 1_900],
  ground: 'ship',
  craftHeight: 1.45,
};

/** The legs swing out between these heights, metres. */
const LEGS = { from: 250, to: 100 } as const;

type Mode = 'ready' | 'flying' | 'down';
type Phase = Exclude<keyof typeof copy.status, 'soft' | 'hard'> | 'down';

export function createLanding(): Chapter {
  const full = craft.stages[0].thrust;
  const tank = craft.stages[0].fuel ?? 1;
  let L = layoutFor(1, 1, SKY);
  let mode: Mode = 'ready';
  let flight: Flight = inTheAir(craft, drop.height, 0);
  let armed = false;
  let on = false;
  let clock = 0;
  let landedAt: number | null = null;
  let touchdown = 0;
  let phase: Phase = 'ready';

  /** How much speed full power takes off each second, m/s². */
  const slowing = () => full / massOf(craft, flight) - gravityAt(flight.height);

  function phaseNow(): Phase {
    if (mode !== 'flying') return mode === 'ready' ? 'ready' : 'down';
    if (!hasFuel(flight)) return 'empty';
    if (flight.speed >= 0) return 'rising';
    return on && thrustOf(craft, flight) > weightOf(craft, flight) ? 'braking' : 'falling';
  }

  return {
    lines: [
      { key: 'weight', label: copy.working.weight, tone: 'pull' },
      { key: 'net', label: copy.working.net },
      { key: 'stop', label: copy.working.stop, tone: 'push' },
      { key: 'fuel', label: copy.working.fuel },
      { key: 'motion', label: copy.working.motion },
    ],

    step(dt, input) {
      clock += dt;
      const sounds: Sound[] = [];
      if (mode !== 'flying') {
        // The press that drops the booster is not a burn: the engine answers
        // the next one.
        if (input.pressed) {
          flight = inTheAir(craft, drop.height, drop.speed);
          mode = 'flying';
          armed = false;
          landedAt = null;
        }
      } else {
        if (!input.held) armed = true;
        on = input.held && armed;
        flight = advance(craft, flight, dt, on);
        if (flight.touchdownSpeed !== null) {
          mode = 'down';
          on = false;
          touchdown = flight.touchdownSpeed;
          landedAt = clock;
          sounds.push(touchdown < SOFT_LANDING ? 'chime' : 'thud');
        }
      }
      phase = phaseNow();
      return sounds;
    },

    status() {
      if (phase === 'ready') return copy.status.ready(fmt.altitude(drop.height));
      if (phase === 'down') return (touchdown < SOFT_LANDING ? copy.status.soft : copy.status.hard)(fmt.speed(touchdown));
      return copy.status[phase];
    },

    button: () => copy.button[mode],

    working() {
      const mass = massOf(craft, flight);
      const falling = mode === 'flying' && flight.speed < 0;
      const slow = slowing();
      const stop = falling
        ? `(${fmt.speed(flight.speed)})² ÷ (2 × ${fmt.acceleration(slow)}) = ${fmt.altitude((flight.speed * flight.speed) / (2 * slow))}`
        : fmt.altitude(0);
      const left = flight.fuel[0] ?? 0;
      return {
        weight: weightLine(mass, flight.height),
        net: netLine(thrustOf(craft, flight), weightOf(craft, flight), flight.onPad),
        stop: slow > 0 ? stop : copy.working.cannotStop,
        fuel: `${fmt.kilograms(left)} · ${Math.round(left / (full / craft.stages[0].exhaust))} s ${copy.working.atFullPower}`,
        motion: motionLine(mode === 'flying' ? flight.speed : 0, fmt.altitude(flight.height)),
      };
    },

    engine: () => thrustOf(craft, flight) / full,

    resize(w, h) {
      L = layoutFor(w, h, SKY);
    },
    backdrop: (ctx, pal) => drawBackdrop(ctx, L, pal),
    still: (ctx, pal, seed) => drawStill(ctx, L, pal, seed),

    moment(ctx, pal, frame) {
      const thrust = thrustOf(craft, flight);
      const flame = thrust / full;
      const legs = mode === 'down' ? 1 : Math.max(0, Math.min(1, (LEGS.from - flight.height) / (LEGS.from - LEGS.to)));
      drawMoment(ctx, L, pal, {
        craft: { kind: 'booster', legs, fuel: (flight.fuel[0] ?? 0) / tank },
        baseY: heightToY(L, flight.height),
        shake: frame.reduced ? 0 : (Math.random() - 0.5) * 2 * flame * 0.8,
        flame,
        onPad: flight.onPad,
        thrust,
        weight: weightOf(craft, flight),
        fullThrust: full,
        thrustLabel: rocketCopy.arrows.thrust,
        weightLabel: rocketCopy.arrows.weight,
        t: frame.t,
        seed: frame.seed,
        sinceLanding: landedAt === null || frame.reduced ? null : clock - landedAt,
        landingSpeed: touchdown,
        highest: null,
        highestLabel: '',
        trail: false,
        spent: null,
      });
    },
  };
}
