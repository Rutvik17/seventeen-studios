/**
 * The words on the rocket-physics entry. The numbers beside them are computed
 * by `lib/rocket/physics.ts`; nothing here states a figure.
 */

export type RocketChapter = {
  title: string;
  lede: string;
};

export const rocketChapters: RocketChapter[] = [
  {
    title: 'The Invisible Anchor',
    lede: 'Gravity pulls everything down. To escape, our engines must push harder than Earth pulls!',
  },
];

export const rocketCopy = {
  chapter: 'Chapter',
  hold: 'Hold to fire thrusters',
  holdCursor: 'Hold',
  drawing: 'A pencil drawing of a rocket on a launch pad, with Earth below and a height ruler up the side.',
  sound: 'Sound',
  deck: { label: 'Chapters', previous: 'Previous chapter', next: 'Next chapter' },

  /** What the rocket is doing, in one line, for each moment of a flight. */
  status: {
    ready: 'Earth is pulling the rocket down. Hold the button to push back.',
    straining: 'Not yet — the push is still weaker than Earth’s pull.',
    climbing: 'Lift-off! The push is bigger than the pull.',
    fastEnough: 'Fast enough! Let go now and it will never come back.',
    coasting: 'Engine off. Gravity is slowing it down…',
    above: 'It’s above this page, but not fast enough to escape. It will be back.',
    falling: 'Gravity is pulling it back down.',
    landed: 'It fell back. Hold for longer to go faster.',
    escaped: 'Escaped! It’s going too fast for Earth to pull it back.',
  },

  /** The working, line by line: each said in words first. */
  working: {
    weight: 'Earth’s pull (weight) = mass × gravity',
    thrust: 'Engine’s push (thrust)',
    net: 'Push − pull',
    escape: 'Escape speed = √(2 × gravity × distance from Earth’s centre)',
    motion: 'Speed and height',
    fullPower: 'at full power',
    up: 'up',
    down: 'down',
    faster: 'faster than escape speed',
    slower: 'slower than escape speed',
    padHolds: 'the pad holds it up',
  },

  /** The arrows drawn on the rocket. */
  arrows: { push: 'push', pull: 'pull' },

  glossary: [
    'A newton (N) measures a push or a pull; a kilonewton (kN) is 1,000 of them.',
    'Gravity is measured in m/s²: how many metres per second faster a falling thing goes, every second.',
    '√ means square root: the number that, multiplied by itself, makes the number inside.',
    'Escape speed only matters once the engine stops. Going at least that fast, gravity can slow the rocket down but never pull it back.',
  ],

  leavesOut: 'Time runs faster in this drawing than in real life, and it leaves out air, Earth’s spin and the fuel a rocket burns.',

  /** Marks up the height ruler, with how high each one is. */
  landmarks: [
    { km: 11, label: 'airliners' },
    { km: 100, label: 'space begins' },
    { km: 400, label: 'space station' },
  ],
  highest: 'highest',
} as const;
