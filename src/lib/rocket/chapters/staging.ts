/**
 * Chapter two: burning fuel makes a rocket lighter, and dropping an empty
 * stage makes it lighter still. Hold the button and watch the gauges drain;
 * the first stage drops off when it runs dry and tumbles back down.
 *
 * The comparison line is flown, not stated: the same fuel in one stage and in
 * two, each burnt to the last drop by the same model.
 */

import { rocketCopy, stagingCopy as copy } from '@/content/rocket';
import { ONE_STAGE, SPENT_STAGE, TWO_STAGES as craft } from '../crafts';
import { advance, burnToEmpty, hasFuel, inTheAir, massOf, onThePad, thrustOf, weightOf, type Flight } from '../physics';
import { STACK_HEIGHT } from '../shape';
import { drawBackdrop, drawMoment, drawStill, heightToY, layoutFor, type SkyConfig } from '../sky';
import * as fmt from '../format';
import { motionLine, netLine } from './lines';
import { LIFT_OFF_SKY } from './liftOff';
import type { Chapter, Sound } from './chapter';

const SKY: SkyConfig = { ...LIFT_OFF_SKY, landmarks: copy.landmarks, craftHeight: STACK_HEIGHT };

/** Seconds each passing moment keeps the line under the button. */
const HOLD = { dropped: 1.5, burnout: 3 } as const;

/** How fast a dropped stage tumbles, radians a second. */
const TUMBLE = 1.6;

type Phase = keyof typeof copy.status;

/** Top speeds with every drop burnt, flown once: two stages, and the same fuel in one. */
let topSpeeds: { two: number; one: number } | null = null;
function tops() {
  topSpeeds ??= { two: burnToEmpty(craft).speed, one: burnToEmpty(ONE_STAGE).speed };
  return topSpeeds;
}

export function createStaging(): Chapter {
  const full = craft.stages[0].thrust;
  const tanks = craft.stages.map((s) => s.fuel ?? 1);
  let L = layoutFor(1, 1, SKY);
  let flight: Flight = onThePad(craft);
  let spent: Flight | null = null;
  let turn = 0;
  let on = false;
  let clock = 0;
  let droppedAt: number | null = null;
  let burnoutAt: number | null = null;
  let burnoutSpeed = 0;
  let landedAt: number | null = null;
  let touchdown: number | null = null;
  let highest: number | null = null;
  let phase: Phase = 'ready';

  const fuelFraction = (i: number) => (flight.fuel[i] ?? 0) / tanks[i];

  function phaseNow(): Phase {
    if (flight.onPad) return on ? 'straining' : touchdown !== null ? 'landed' : 'ready';
    if (burnoutAt !== null && clock - burnoutAt < HOLD.burnout) return 'burnout';
    if (droppedAt !== null && clock - droppedAt < HOLD.dropped) return 'dropped';
    if (flight.speed < 0) return 'falling';
    if (thrustOf(craft, flight) > weightOf(craft, flight)) return flight.stage === 0 ? 'first' : 'second';
    return on && hasFuel(flight) ? 'slowing' : 'coasting';
  }

  return {
    lines: [
      { key: 'mass', label: copy.working.mass },
      { key: 'net', label: copy.working.net },
      { key: 'speedUp', label: copy.working.speedUp, tone: 'push' },
      { key: 'motion', label: copy.working.motion },
      { key: 'compare', label: copy.working.compare, tone: 'escape' },
    ],

    step(dt, input) {
      clock += dt;
      const sounds: Sound[] = [];
      if (input.pressed && flight.onPad) {
        flight = onThePad(craft);
        spent = null;
        droppedAt = null;
        burnoutAt = null;
        landedAt = null;
      }
      if (input.pressed) touchdown = null;
      on = input.held && touchdown === null;

      const hadFuel = hasFuel(flight);
      flight = advance(craft, flight, dt, on);
      if (flight.dropped !== null) {
        spent = inTheAir(SPENT_STAGE, flight.height, flight.speed);
        turn = 0;
        droppedAt = clock;
        sounds.push('clunk');
      }
      if (hadFuel && !hasFuel(flight)) {
        burnoutAt = clock;
        burnoutSpeed = flight.speed;
      }
      if (flight.touchdownSpeed !== null) {
        landedAt = clock;
        touchdown = flight.touchdownSpeed;
        highest = flight.highest;
        sounds.push('thud');
      }
      if (spent) {
        spent = advance(SPENT_STAGE, spent, dt, false);
        turn += dt * TUMBLE;
        if (spent.touchdownSpeed !== null) spent = null;
      }
      phase = phaseNow();
      return sounds;
    },

    status() {
      if (phase === 'burnout') return copy.status.burnout(fmt.roughSpeed(burnoutSpeed));
      if (phase === 'landed') return copy.status.landed(fmt.speed(touchdown ?? 0));
      return copy.status[phase];
    },

    button: () => copy.button,

    working() {
      const mass = massOf(craft, flight);
      const thrust = thrustOf(craft, flight);
      const weight = weightOf(craft, flight);
      const net = thrust - weight;
      const held = flight.onPad && net <= 0;
      const top = tops();
      return {
        mass: fmt.kilograms(mass),
        net: netLine(thrust, weight, flight.onPad),
        speedUp: held
          ? `0 m/s² — ${rocketCopy.groundHolds}`
          : `${fmt.newtons(Math.abs(net))} ÷ ${fmt.kilograms(mass)} = ${fmt.acceleration(net / mass)} ${net >= 0 ? rocketCopy.up : rocketCopy.down}`,
        motion: motionLine(flight.speed, fmt.height(flight.height)),
        compare: `${copy.working.twoStages} ${fmt.roughSpeed(top.two)} · ${copy.working.oneStage} ${fmt.roughSpeed(top.one)}`,
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
      const flame = thrust / craft.stages[flight.stage].thrust;
      drawMoment(ctx, L, pal, {
        craft: { kind: 'stack', stage: flight.stage, fuel: [fuelFraction(0), fuelFraction(1)] },
        baseY: heightToY(L, flight.height),
        shake: frame.reduced ? 0 : (Math.random() - 0.5) * 2 * flame * (flight.onPad ? 2.6 : 0.8),
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
        landingSpeed: touchdown ?? 0,
        highest,
        highestLabel: highest === null ? '' : `${rocketCopy.highest} · ${fmt.height(highest)}`,
        trail: !flight.onPad,
        spent: spent ? { baseY: heightToY(L, spent.height), turn: frame.reduced ? 0.4 : turn } : null,
      });
    },
  };
}
