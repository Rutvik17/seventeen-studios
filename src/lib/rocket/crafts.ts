/**
 * The machines the rocket entry flies, one per chapter, in one place so the
 * page and `scripts/verify-rocket.mjs` fly the same ones.
 *
 * They are made up, but each is built to real proportions: exhaust speeds are
 * those of a kerosene engine (see `physics.ts`), and thrust is a sensible
 * multiple of weight. Their sizes are chosen so a few seconds of holding a
 * button tells the whole story.
 */

import type { Craft } from './physics';

/**
 * Chapter one's rocket: 10 tonnes and 300 kN, a little over three times its
 * weight. Its engine never runs dry and the rocket never gets lighter — the
 * chapter is about push against pull, and fuel comes in chapter two.
 */
export const LIFT_OFF: Craft = {
  stages: [{ dry: 10_000, fuel: null, thrust: 300_000, exhaust: 3_000 }],
  spool: 1.6,
  cut: 0.2,
  timeScale: (h) => 55 * (1 + h / 150_000),
};

/** How fast the staging chapter runs: fast enough to see a whole flight, slow enough to watch the fuel go. */
const stagingTime = (h: number) => 30 * (1 + h / 400_000);

/**
 * Chapter two: 30 tonnes on the pad, most of it fuel, in two stages. The
 * first stage's big engine lifts the lot; the second's small one only has to
 * push what is left once the first has dropped away.
 */
export const TWO_STAGES: Craft = {
  stages: [
    { dry: 3_000, fuel: 21_000, thrust: 600_000, exhaust: 3_000 },
    { dry: 1_000, fuel: 5_000, thrust: 120_000, exhaust: 3_000 },
  ],
  spool: 1,
  cut: 0.2,
  timeScale: stagingTime,
};

/** The same empty mass and the same fuel as `TWO_STAGES`, in one stage: what staging is measured against. */
export const ONE_STAGE: Craft = {
  stages: [{ dry: 4_000, fuel: 26_000, thrust: 600_000, exhaust: 3_000 }],
  spool: 1,
  cut: 0.2,
  timeScale: stagingTime,
};

/** An empty first stage, falling back once it has dropped off. */
export const SPENT_STAGE: Craft = {
  stages: [{ dry: TWO_STAGES.stages[0].dry, fuel: 0, thrust: 0, exhaust: 3_000 }],
  spool: 1,
  cut: 0.2,
  timeScale: stagingTime,
};

/**
 * Chapter four: a booster coming home with the fuel it saved. 400 kN against
 * 25 tonnes is 1.6 times its weight, so the engine slows it — and cannot
 * hover it, which is why a landing has to be timed. Time runs at life's pace
 * near the ground, where the timing matters.
 */
export const BOOSTER: Craft = {
  stages: [{ dry: 20_000, fuel: 5_000, thrust: 400_000, exhaust: 3_000 }],
  spool: 0.15,
  cut: 0.08,
  timeScale: (h) => 1 + h / 1_200,
};

/**
 * Where the booster starts: 2.5 km up, already falling at 40 m/s — a few
 * seconds before it is too late to start the burn, time enough to read.
 */
export const BOOSTER_DROP = { height: 2_500, speed: -40 } as const;

/** A touchdown slower than this is a soft landing, m/s. The drawing's own rule. */
export const SOFT_LANDING = 5;

/**
 * Chapter three: Newton's cannon, standing as high as the space station
 * flies. Holding the button loads it, faster the longer it is held, up to a
 * throw well past escape speed.
 */
export const CANNON = {
  height: 400_000,
  /** m/s */
  topSpeed: 12_000,
  /** Real seconds of holding to reach `topSpeed`. */
  loadSeconds: 4,
  /** Simulated seconds per real second of flight: one trip round in about seven seconds. */
  timeScale: 800,
} as const;
