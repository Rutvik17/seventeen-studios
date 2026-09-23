/**
 * Two double pendulums, one billionth of a radian apart.
 *
 * A double pendulum is a pendulum hanging off the end of another pendulum. It
 * obeys equations anyone can write down and it is still unpredictable: two of
 * them released from almost exactly the same place follow each other for a few
 * seconds and then go completely different ways. That is what "chaotic" means
 * in physics — not random, but so sensitive to where it started that any error
 * in the start, however small, eventually swamps everything.
 *
 * The landing runs two of them and prints how far apart their tips are. The gap
 * starts at about a nanometre and passes a metre inside fifteen seconds, and
 * the readout fits the rate it grows at rather than asserting it.
 *
 * ---
 *
 * THE MODEL
 *
 * Two point masses on massless rigid rods, no friction. The state is four
 * numbers: each rod's angle from straight down (θ, "theta", in radians) and how
 * fast that angle is changing (ω, "omega", in radians per second). The
 * equations of motion below are the standard ones from Lagrangian mechanics for
 * this system; they give each rod's angular acceleration from the state.
 *
 * ---
 *
 * WHY RUNGE–KUTTA, AND WHY THE ENERGY IS PRINTED
 *
 * A simulation steps time forward in small slices. The simplest way — take the
 * current rate of change and multiply by the slice — leaks or gains energy on
 * every step, and on a chaotic system that error is indistinguishable from the
 * chaos itself. Fourth-order Runge–Kutta ("RK4") samples the rate of change
 * four times across each slice and blends them, which cuts that error by a
 * factor of roughly the slice length cubed.
 *
 * With no friction the total energy must never change, so any change in it is
 * the integrator's own error. The readout prints it. That is the check a
 * sceptical reader would ask for: a divergence you can see, next to proof that
 * the arithmetic is not the thing diverging.
 */

/** Gravity, metres per second squared. */
export const G = 9.81;
/** Rod lengths, metres. */
export const L1 = 1;
export const L2 = 1;
/** Bob masses, kilograms. */
export const M1 = 1;
export const M2 = 1;

/** The difference between the two pendulums' starting upper angles, radians. */
export const EPSILON = 1e-9;

/** Integration step, seconds. 1/480 s — eight steps per 60 Hz frame. */
export const DT = 1 / 480;

export type State = { t1: number; t2: number; w1: number; w2: number };

type Rates = { dt1: number; dt2: number; dw1: number; dw2: number };

/** Angular accelerations of both rods for a given state. */
function rates(s: State): Rates {
  const d = s.t1 - s.t2;
  const den = 2 * M1 + M2 - M2 * Math.cos(2 * s.t1 - 2 * s.t2);

  const dw1 =
    (-G * (2 * M1 + M2) * Math.sin(s.t1) -
      M2 * G * Math.sin(s.t1 - 2 * s.t2) -
      2 * Math.sin(d) * M2 * (s.w2 * s.w2 * L2 + s.w1 * s.w1 * L1 * Math.cos(d))) /
    (L1 * den);

  const dw2 =
    (2 *
      Math.sin(d) *
      (s.w1 * s.w1 * L1 * (M1 + M2) +
        G * (M1 + M2) * Math.cos(s.t1) +
        s.w2 * s.w2 * L2 * M2 * Math.cos(d))) /
    (L2 * den);

  return { dt1: s.w1, dt2: s.w2, dw1, dw2 };
}

function add(s: State, r: Rates, h: number): State {
  return {
    t1: s.t1 + r.dt1 * h,
    t2: s.t2 + r.dt2 * h,
    w1: s.w1 + r.dw1 * h,
    w2: s.w2 + r.dw2 * h,
  };
}

/** One fourth-order Runge–Kutta step of length `h` seconds. */
export function step(s: State, h: number = DT): State {
  const k1 = rates(s);
  const k2 = rates(add(s, k1, h / 2));
  const k3 = rates(add(s, k2, h / 2));
  const k4 = rates(add(s, k3, h));
  return {
    t1: s.t1 + (h / 6) * (k1.dt1 + 2 * k2.dt1 + 2 * k3.dt1 + k4.dt1),
    t2: s.t2 + (h / 6) * (k1.dt2 + 2 * k2.dt2 + 2 * k3.dt2 + k4.dt2),
    w1: s.w1 + (h / 6) * (k1.dw1 + 2 * k2.dw1 + 2 * k3.dw1 + k4.dw1),
    w2: s.w2 + (h / 6) * (k1.dw2 + 2 * k2.dw2 + 2 * k3.dw2 + k4.dw2),
  };
}

/**
 * Total energy, joules: movement (kinetic) plus height (potential).
 *
 * Height is measured up from the pivot, so a bob below it has negative
 * potential energy. Only differences matter, so the zero is arbitrary.
 */
export function energy(s: State): number {
  const potential = -(M1 + M2) * G * L1 * Math.cos(s.t1) - M2 * G * L2 * Math.cos(s.t2);
  const kinetic =
    0.5 * M1 * L1 * L1 * s.w1 * s.w1 +
    0.5 *
      M2 *
      (L1 * L1 * s.w1 * s.w1 +
        L2 * L2 * s.w2 * s.w2 +
        2 * L1 * L2 * s.w1 * s.w2 * Math.cos(s.t1 - s.t2));
  return potential + kinetic;
}

/** The energy of both bobs hanging straight down and still — the lowest possible. */
export const ENERGY_AT_REST = -(M1 + M2) * G * L1 - M2 * G * L2;

/** Where the two bobs are, metres from the pivot, y pointing down. */
export function bobs(s: State): { x1: number; y1: number; x2: number; y2: number } {
  const x1 = L1 * Math.sin(s.t1);
  const y1 = L1 * Math.cos(s.t1);
  return { x1, y1, x2: x1 + L2 * Math.sin(s.t2), y2: y1 + L2 * Math.cos(s.t2) };
}

/**
 * The rod angles that put the tip at (x, y), for dragging it by hand.
 *
 * Two-rod inverse kinematics: the law of cosines gives the bend at the middle
 * joint, and there are two mirror-image answers. This takes the one with the
 * elbow on the outside of the swing, which is the one a hand dragging the tip
 * expects. A point out of reach is pulled back onto the edge of the reach.
 */
export function reach(x: number, y: number): { t1: number; t2: number } {
  let dist = Math.hypot(x, y);
  const max = (L1 + L2) * 0.999;
  const min = Math.abs(L1 - L2) + 1e-3;
  if (dist > max) {
    x *= max / dist;
    y *= max / dist;
    dist = max;
  }
  if (dist < min) dist = min;

  const toTip = Math.atan2(x, y);
  const cosInner = (L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist);
  const inner = Math.acos(Math.max(-1, Math.min(1, cosInner)));
  const t1 = toTip + (x >= 0 ? -inner : inner);
  const x1 = L1 * Math.sin(t1);
  const y1 = L1 * Math.cos(t1);
  const t2 = Math.atan2(x - x1, y - y1);
  return { t1, t2 };
}

/** The default release: both rods raised well above horizontal, at rest. */
export const START: State = { t1: (125 * Math.PI) / 180, t2: (160 * Math.PI) / 180, w1: 0, w2: 0 };

/** The second pendulum: the first with its upper angle nudged by `EPSILON`. */
export function twin(s: State): State {
  return { ...s, t1: s.t1 + EPSILON };
}

/**
 * The pair, stepped together, with everything the readout prints.
 *
 * `rate` is fitted, not assumed. While the gap is still tiny it grows
 * exponentially — it multiplies by the same factor every second — so the
 * logarithm of the gap rises in a straight line, and the slope of that line is
 * the growth rate λ ("lambda", per second). It is fitted by ordinary least
 * squares on every step between a tenth of a second in (once the gap has
 * settled into growing) and the gap reaching a centimetre (after which the
 * pendulums are no longer nearly the same, and the straight line bends over).
 * The doubling time is ln 2 ÷ λ.
 */
export class Pair {
  a: State;
  b: State;
  time = 0;
  readonly e0: number;
  /** Energy error, as a fraction of the energy above rest the pair started with. */
  drift = 0;
  /** Least-squares sums for ln(gap) against time. */
  private n = 0;
  private sx = 0;
  private sy = 0;
  private sxx = 0;
  private sxy = 0;
  private fitting = true;

  constructor(start: State = START) {
    this.a = { ...start };
    this.b = twin(start);
    this.e0 = energy(this.a);
  }

  /** Distance between the two tips, metres. */
  gap(): number {
    const p = bobs(this.a);
    const q = bobs(this.b);
    return Math.hypot(p.x2 - q.x2, p.y2 - q.y2);
  }

  advance(steps: number): void {
    for (let i = 0; i < steps; i += 1) {
      this.a = step(this.a);
      this.b = step(this.b);
      this.time += DT;

      if (this.fitting) {
        const g = this.gap();
        if (g >= 0.01) this.fitting = false;
        else if (this.time > 0.1 && g > 0) {
          const y = Math.log(g);
          this.n += 1;
          this.sx += this.time;
          this.sy += y;
          this.sxx += this.time * this.time;
          this.sxy += this.time * y;
        }
      }
    }
    this.drift = (energy(this.a) - this.e0) / (this.e0 - ENERGY_AT_REST);
  }

  /**
   * The fitted growth rate λ, per second, or null before there is enough of the
   * line to fit. Two seconds of it: over less, the gap's own wobble — it grows
   * in surges, fastest as the bobs swing through the bottom — outweighs the
   * trend, and the first version printed a doubling time of 79 s at t = 2.
   */
  rate(): number | null {
    if (this.n < 2 / DT) return null;
    const den = this.n * this.sxx - this.sx * this.sx;
    if (den === 0) return null;
    const slope = (this.n * this.sxy - this.sx * this.sy) / den;
    return slope > 0 ? slope : null;
  }

  /** Seconds for the gap to double, ln 2 ÷ λ. */
  doubling(): number | null {
    const r = this.rate();
    return r ? Math.LN2 / r : null;
  }
}

/**
 * A length for people, not for a physics exam: 3.1 nm, 420 µm, 12 cm.
 */
export function formatLength(m: number): string {
  const units: [number, string][] = [
    [1, 'm'],
    [1e-2, 'cm'],
    [1e-3, 'mm'],
    [1e-6, 'µm'],
    [1e-9, 'nm'],
    [1e-12, 'pm'],
  ];
  const abs = Math.abs(m);
  const [scale, unit] = units.find(([s]) => abs >= s) ?? units[units.length - 1];
  const v = m / scale;
  return `${v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)} ${unit}`;
}

/** The tip's path over `seconds`, for drawing a finished trace in one go. */
export function tracePair(seconds: number, start: State = START, every = 4) {
  const pair = new Pair(start);
  const a: { x: number; y: number }[] = [];
  const b: { x: number; y: number }[] = [];
  const total = Math.round(seconds / DT);
  for (let i = 0; i < total; i += every) {
    pair.advance(every);
    const p = bobs(pair.a);
    const q = bobs(pair.b);
    a.push({ x: p.x2, y: p.y2 });
    b.push({ x: q.x2, y: q.y2 });
  }
  return { pair, a, b };
}
