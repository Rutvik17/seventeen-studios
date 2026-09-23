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
    lede: 'Gravity pulls everything toward the middle of the Earth. A rocket lifts off only when its engine pushes harder than that pull. When the engine stops, gravity slows it and brings it back down, which is how reusable rockets come home. Only a rocket faster than escape speed never returns.',
  },
];

export const rocketCopy = {
  chapter: 'Chapter',
  hold: 'Hold to fire the engine',
  holdCursor: 'Hold',
  drawing: 'A pencil drawing of a rocket on a launch pad, with Earth below and a height ruler up the side.',
  sound: 'Sound',
  deck: { label: 'Chapters', previous: 'Previous chapter', next: 'Next chapter' },

  /**
   * What the rocket is doing, in one short line. Which one shows is decided by
   * the forces, not the button: push against pull, and which way it is going.
   */
  status: {
    ready: 'On the pad. Gravity pulls it down; the ground holds it up.',
    straining: 'The engine is on, but not pushing harder than gravity yet.',
    climbing: 'The push beats the pull, so it climbs faster and faster.',
    slowing: 'The engine is on, but gravity is still winning. The climb is slowing.',
    fastEnough: 'Faster than escape speed! Let go now and it never comes back.',
    coasting: 'Engine off. Gravity is slowing it down.',
    above: 'Out of sight, but too slow to escape. Gravity will bring it back.',
    falling: 'Falling back. Fire the engine to slow it down.',
    braking: 'The engine is slowing the fall. That is how reusable rockets land.',
    landed: (speed: string) => `Back on the ground, landing at ${speed}.`,
    escaped: 'Escaped! Gravity can slow it down, but never bring it back.',
  },

  /** The working, line by line, in words first. */
  working: {
    weight: 'Gravity’s pull (weight) = mass × gravity',
    thrust: 'Engine’s push (thrust)',
    net: 'Push − pull',
    escape: 'Escape speed = √(2 × gravity × distance from Earth’s centre)',
    motion: 'Speed and height',
    fullPower: 'at full power',
    up: 'up',
    down: 'down',
    faster: 'faster than escape speed',
    slower: 'slower than escape speed',
    groundHolds: 'the ground holds it up',
  },

  /** The arrows drawn on the rocket. */
  arrows: { thrust: 'push', weight: 'pull' },

  glossary: [
    'A newton (N) measures a push or a pull. A kilonewton (kN) is 1,000 newtons.',
    'Gravity, in m/s², is how much faster a falling thing goes every second. It gets weaker the higher you go.',
    '√ means square root: the number that, multiplied by itself, makes the number inside.',
    'Most rockets never need escape speed. Satellites circle Earth more slowly than that, and boosters like SpaceX’s Falcon 9 and Rocket Lab’s Neutron are built to come back and land.',
  ],

  leavesOut: 'Kept simple: the rocket flies straight up, time is sped up, and there is no air, no spinning Earth and no fuel getting used up.',

  /** Marks up the height ruler, with how high each one is. */
  landmarks: [
    { km: 11, label: 'airliners' },
    { km: 100, label: 'space begins' },
    { km: 400, label: 'space station' },
  ],
  highest: 'highest',
} as const;
