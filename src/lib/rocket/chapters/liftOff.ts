/**
 * Chapter one: push against pull. Hold the button and the engine fires; the
 * rocket leaves the pad only once its push beats gravity's pull, and escapes
 * only if it is faster than escape speed when the engine stops.
 */

import { liftOffCopy as copy, rocketCopy } from '@/content/rocket';
import { LIFT_OFF as craft } from '../crafts';
import { advance, massOf, onThePad, thrustOf, weightOf, wouldEscape, type Flight } from '../physics';
import { drawBackdrop, drawMoment, drawStill, heightToY, layoutFor, type SkyConfig } from '../sky';
import * as fmt from '../format';
import { escapeLine, motionLine, netLine, thrustLine, weightLine } from './lines';
import type { Chapter, Sound } from './chapter';

/** Height at which the rocket has left the top of the drawing, metres. */
const EXIT_HEIGHT = 40_000_000;

export const LIFT_OFF_SKY: SkyConfig = {
  scale: { knee: 1_000, top: EXIT_HEIGHT },
  ruler: [1_000, 10_000, 100_000, 1_000_000, 10_000_000],
  landmarks: copy.landmarks,
  clouds: [2_500, 6_000],
  ground: 'pad',
  craftHeight: 1,
};

type Phase = keyof typeof copy.status;

export function createLiftOff(): Chapter {
  const full = craft.stages[0].thrust;
  let L = layoutFor(1, 1, LIFT_OFF_SKY);
  let flight: Flight = onThePad(craft);
  let on = false;
  let escaped = false;
  let gone = false;
  let clock = 0;
  let landedAt: number | null = null;
  let touchdown: number | null = null;
  let highest: number | null = null;
  let phase: Phase = 'ready';

  function phaseNow(): Phase {
    if (escaped) return 'escaped';
    if (flight.onPad) return on ? 'straining' : touchdown !== null ? 'landed' : 'ready';
    // What the forces are doing, not what the button is: an engine still
    // spooling up in the air is on, but not yet out-pushing gravity.
    const lifting = thrustOf(craft, flight) > weightOf(craft, flight);
    if (flight.speed >= 0) {
      if (on && wouldEscape(flight.height, flight.speed)) return 'fastEnough';
      if (lifting) return 'climbing';
      if (on) return 'slowing';
      return flight.height > EXIT_HEIGHT ? 'above' : 'coasting';
    }
    return on && lifting ? 'braking' : 'falling';
  }

  return {
    lines: [
      { key: 'weight', label: copy.working.weight, tone: 'pull' },
      { key: 'thrust', label: copy.working.thrust, tone: 'push' },
      { key: 'net', label: copy.working.net },
      { key: 'escape', label: copy.working.escape, tone: 'escape' },
      { key: 'motion', label: copy.working.motion },
    ],

    step(dt, input) {
      clock += dt;
      const sounds: Sound[] = [];
      // A new press on the ground, or once the last rocket has gone, starts a
      // fresh flight, so its highest point is its own. A press in mid-air is
      // a burn, not a new flight.
      if (input.pressed && (gone || flight.onPad)) {
        flight = onThePad(craft);
        escaped = false;
        gone = false;
        landedAt = null;
      }
      if (input.pressed) touchdown = null;
      // A landing ends the flight: holding on through it does not launch the
      // rocket straight back up.
      on = input.held && touchdown === null;
      if (!gone) {
        flight = advance(craft, flight, dt, on);
        if (flight.touchdownSpeed !== null) {
          landedAt = clock;
          touchdown = flight.touchdownSpeed;
          highest = flight.highest;
          sounds.push('thud');
        }
      }
      if (!escaped && wouldEscape(flight.height, flight.speed) && (!on || flight.height > EXIT_HEIGHT)) {
        escaped = true;
        sounds.push('chime');
      }
      if (escaped && flight.height > EXIT_HEIGHT) gone = true;
      phase = phaseNow();
      return sounds;
    },

    status() {
      return phase === 'landed' ? copy.status.landed(fmt.speed(touchdown ?? 0)) : copy.status[phase];
    },

    button: () => copy.button,

    working() {
      const weight = weightOf(craft, flight);
      const verdict = flight.onPad ? '' : `, ${wouldEscape(flight.height, flight.speed) ? copy.working.faster : copy.working.slower}`;
      return {
        weight: weightLine(massOf(craft, flight), flight.height),
        thrust: thrustLine(thrustOf(craft, flight), full),
        net: netLine(thrustOf(craft, flight), weight, flight.onPad),
        escape: escapeLine(flight.height),
        motion: motionLine(flight.speed, fmt.height(flight.height), verdict),
      };
    },

    engine: () => (gone ? 0 : thrustOf(craft, flight) / full),

    resize(w, h) {
      L = layoutFor(w, h, LIFT_OFF_SKY);
    },
    backdrop: (ctx, pal) => drawBackdrop(ctx, L, pal),
    still: (ctx, pal, seed) => drawStill(ctx, L, pal, seed),

    moment(ctx, pal, frame) {
      const flame = thrustOf(craft, flight) / full;
      drawMoment(ctx, L, pal, {
        craft: { kind: 'rocket' },
        baseY: heightToY(L, gone ? EXIT_HEIGHT * 4 : flight.height),
        shake: frame.reduced ? 0 : (Math.random() - 0.5) * 2 * flame * (flight.onPad ? 2.6 : 0.8),
        flame,
        onPad: flight.onPad,
        thrust: thrustOf(craft, flight),
        weight: weightOf(craft, flight),
        fullThrust: full,
        thrustLabel: rocketCopy.arrows.thrust,
        weightLabel: rocketCopy.arrows.weight,
        t: frame.t,
        seed: frame.seed,
        sinceLanding: landedAt === null || frame.reduced ? null : clock - landedAt,
        landingSpeed: touchdown ?? 0,
        highest,
        highestLabel: highest === null ? '' : `${rocketCopy.highest} · ${fmt.height(highest)}`,
        trail: !flight.onPad || gone,
        spent: null,
      });
    },
  };
}
