/**
 * The rocket entry's physics: rockets flown straight up from Earth's surface
 * or dropped back onto it, and what gravity does to them. Orbits — the one
 * chapter that needs a second dimension — are in `orbit.ts`, on the same
 * gravity.
 *
 * Pure functions of numbers — no canvas, no DOM — so the page, the share card
 * and the checks in `scripts` all run the same model.
 *
 * ---
 *
 * THE MODEL, AND WHERE EACH PART COMES FROM
 *
 * - Gravity weakens with height as the inverse square of the distance from
 *   Earth's centre: g(h) = g₀ × (R ÷ (R + h))². g₀ is standard gravity,
 *   9.80665 m/s², a defined value; R is the IUGG mean radius, 6,371,008.8 m.
 *   (Wikipedia, "Gravity of Earth".)
 * - Weight is mass × gravity: W = m × g(h).
 * - Going straight up, the net force is thrust minus weight, so the rocket
 *   accelerates at a = (T − W) ÷ m. It cannot leave the pad until T > W.
 *   (NASA Glenn Research Center, "Acceleration at Liftoff".)
 * - An engine burns fuel at thrust ÷ exhaust speed kilograms a second, so a
 *   rocket gets lighter as it climbs and the same push speeds it up more. The
 *   speed that buys is the rocket equation, Δv = vₑ × ln(m₀ ÷ m₁), less what
 *   gravity takes back meanwhile. (Wikipedia, "Tsiolkovsky rocket equation".)
 *   Exhaust speeds here are 3,000 m/s: kerosene engines like Falcon 9's
 *   Merlin manage 2.77 km/s at sea level and 3.05 km/s in vacuum
 *   (Wikipedia, "SpaceX Merlin").
 * - A stage whose tank runs dry drops off, and the one above it takes over.
 * - Escape speed at distance r from the centre is √(2GM ÷ r). With GM = g₀R²
 *   that is √(2 × g(h) × r): gravity where you are, times how far you are from
 *   the centre. At the surface it comes to 11.18 km/s; the published figure is
 *   11.186 km/s — the small gap is because standard gravity already includes
 *   the effect of Earth's spin, which this model otherwise leaves out.
 *   (Wikipedia, "Escape velocity".)
 * - Escape speed only matters once the engine is off. A rocket that keeps
 *   pushing can leave at any speed; one that stops pushing escapes only if its
 *   speed is at least escape speed for its height — equivalently, its energy
 *   of motion outweighs gravity's hold on it. Below that, it falls back.
 *
 * WHAT IT LEAVES OUT, DELIBERATELY: air and Earth's spin, everywhere; and in
 * the first chapter, the fuel (that rocket never gets lighter). Each chapter
 * says what it leaves out.
 */

/** Earth, as the model sees it. */
export const EARTH = {
  /** Standard gravity, m/s². A defined constant. */
  g0: 9.80665,
  /** Mean radius, metres (IUGG). */
  radius: 6_371_008.8,
} as const;

/** Earth's gravitational parameter, GM = g₀R², m³/s². */
export const GM = EARTH.g0 * EARTH.radius * EARTH.radius;

/** Gravity's strength at height `h` metres, m/s². */
export function gravityAt(h: number): number {
  const ratio = EARTH.radius / (EARTH.radius + h);
  return EARTH.g0 * ratio * ratio;
}

/** Distance from Earth's centre at height `h`, metres. */
export function distanceFromCentre(h: number): number {
  return EARTH.radius + h;
}

/** Escape speed at height `h`, m/s: √(2 × gravity here × distance from the centre). */
export function escapeSpeedAt(h: number): number {
  return Math.sqrt(2 * gravityAt(h) * distanceFromCentre(h));
}

/** The sideways speed that circles the Earth at height `h`, m/s: √(gravity here × distance from the centre). */
export function circleSpeedAt(h: number): number {
  return Math.sqrt(gravityAt(h) * distanceFromCentre(h));
}

/** True when something at height `h` moving up at `v` would never fall back with its engine off. */
export function wouldEscape(h: number, v: number): boolean {
  return v > 0 && v >= escapeSpeedAt(h);
}

/* ------------------------------------------------------------------ *
 * Rockets
 * ------------------------------------------------------------------ */

export type Stage = {
  /** Mass with its tank empty, kg. */
  dry: number;
  /**
   * Fuel it is filled with, kg — or `null` for an engine that never runs dry
   * and never makes the rocket lighter, the first chapter's simplification.
   */
  fuel: number | null;
  /** Push at full power, newtons. */
  thrust: number;
  /** How fast the engine throws out its exhaust, m/s. */
  exhaust: number;
};

export type Craft = {
  /** Bottom stage first; each drops off when its tank runs dry. */
  stages: readonly Stage[];
  /** Real seconds the engine takes to come up to full power. */
  spool: number;
  /** Real seconds it takes to die away when the button is let go. */
  cut: number;
  /**
   * How much faster than life the drawing runs at height `h`. Real flights
   * take minutes, and a reader watches for seconds. It changes how fast the
   * drawing moves, never any number the page shows.
   */
  timeScale: (h: number) => number;
};

export type Flight = {
  /** Height above the ground, metres. */
  height: number;
  /** Upward speed, m/s (negative when falling). */
  speed: number;
  /** Engine power asked for, 0 to 1. */
  throttle: number;
  /** On the ground: weight has not been beaten, or it has come back down. */
  onPad: boolean;
  /** The highest point reached this flight, metres. */
  highest: number;
  /** Set on the step it comes down onto the ground: the speed it hit at, m/s. */
  touchdownSpeed: number | null;
  /** The stage whose engine is firing: the lowest one still attached. */
  stage: number;
  /** Fuel left in each stage, kg (`null` where fuel is not modelled). */
  fuel: readonly (number | null)[];
  /** Set on the step a stage runs dry and drops off: which one. */
  dropped: number | null;
};

/** Standing on the pad, every tank full. */
export function onThePad(craft: Craft): Flight {
  return {
    height: 0,
    speed: 0,
    throttle: 0,
    onPad: true,
    highest: 0,
    touchdownSpeed: null,
    stage: 0,
    fuel: craft.stages.map((s) => s.fuel),
    dropped: null,
  };
}

/** Already in the air at `height`, moving up at `speed` (negative: falling), every tank full. */
export function inTheAir(craft: Craft, height: number, speed: number): Flight {
  return { ...onThePad(craft), height, speed, onPad: false, highest: height };
}

/** Everything still attached, with the fuel left in it, kg. */
export function massOf(craft: Craft, f: Flight): number {
  let m = 0;
  for (let i = f.stage; i < craft.stages.length; i += 1) m += craft.stages[i].dry + (f.fuel[i] ?? 0);
  return m;
}

/** Whether the firing stage has fuel to burn. */
export function hasFuel(f: Flight): boolean {
  const left = f.fuel[f.stage];
  return left === null || left > 0;
}

/** The push the engine is giving now, newtons: nothing once the last tank is dry. */
export function thrustOf(craft: Craft, f: Flight): number {
  return hasFuel(f) ? f.throttle * craft.stages[f.stage].thrust : 0;
}

/** Weight at the flight's height, newtons. */
export function weightOf(craft: Craft, f: Flight): number {
  return massOf(craft, f) * gravityAt(f.height);
}

/** Fires from the pad, `frame` seconds at a time, until the last tank is dry: the flight at that moment. */
export function burnToEmpty(craft: Craft, frame = 1 / 60): Flight {
  let f = onThePad(craft);
  for (let i = 0; i < 36_000 && hasFuel(f); i += 1) f = advance(craft, f, frame, true);
  return f;
}

/**
 * Longest step of simulated time taken in one go near the ground, seconds.
 * Steps lengthen with height, where everything changes slowly, so a long coast
 * costs a few hundred steps rather than tens of thousands.
 */
const MAX_STEP = 0.25;

/**
 * Moves the flight on by `realSeconds` of wall-clock time, with the engine on
 * or off, and returns the new state. Pure: the argument is not changed.
 */
export function advance(craft: Craft, flight: Flight, realSeconds: number, engineOn: boolean): Flight {
  const fuel = [...flight.fuel];
  const next: Flight = { ...flight, fuel, touchdownSpeed: null, dropped: null };

  // The engine comes up to power, or dies away, in real time.
  next.throttle = engineOn
    ? Math.min(1, next.throttle + realSeconds / craft.spool)
    : Math.max(0, next.throttle - realSeconds / craft.cut);

  let remaining = realSeconds * craft.timeScale(next.height);
  while (remaining > 0) {
    const dt = Math.min(MAX_STEP * (1 + next.height / 150_000), remaining);
    remaining -= dt;

    const stage = craft.stages[next.stage];
    const thrust = thrustOf(craft, next);
    const before = massOf(craft, next);

    // Burn the fuel this step uses: the rocket is lighter by the end of it.
    const left = fuel[next.stage];
    if (thrust > 0 && left !== null) fuel[next.stage] = Math.max(0, left - (thrust / stage.exhaust) * dt);
    const after = massOf(craft, next);

    if (next.onPad) {
      // The ground holds the rocket up until the push beats the pull.
      if (thrust <= before * gravityAt(0)) {
        next.speed = 0;
        continue;
      }
      next.onPad = false;
    }

    // Velocity Verlet: move with the acceleration here, then correct the speed
    // with the average of the acceleration here and where the rocket arrived.
    // Second-order, so a coast up and back down keeps its energy to well under
    // a tenth of a percent — the speeds the page prints stay honest.
    const a0 = thrust / before - gravityAt(next.height);
    next.height += next.speed * dt + 0.5 * a0 * dt * dt;
    const a1 = thrust / after - gravityAt(Math.max(0, next.height));
    next.speed += 0.5 * (a0 + a1) * dt;
    next.highest = Math.max(next.highest, next.height);

    // An empty stage drops off, and the next one's engine takes over.
    if (fuel[next.stage] === 0 && next.stage < craft.stages.length - 1) {
      next.dropped = next.stage;
      next.stage += 1;
    }

    if (next.height <= 0) {
      next.touchdownSpeed = -next.speed;
      next.height = 0;
      next.speed = 0;
      next.onPad = true;
      break;
    }
  }
  return next;
}
