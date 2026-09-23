/**
 * The words on the rocket-physics entry: four chapters on one page. The
 * numbers beside them are computed by `lib/rocket/`; nothing here states a
 * figure — where a line needs one, it is a function the chapter fills in.
 */

/** Shared by every chapter. */
export const rocketCopy = {
  chapter: 'Chapter',
  holdCursor: 'Hold',
  sound: 'Sound',
  deck: { label: 'Chapters', previous: 'Previous chapter', next: 'Next chapter' },
  /** The arrows drawn on a rocket. */
  arrows: { thrust: 'push', weight: 'pull' },
  up: 'up',
  down: 'down',
  groundHolds: 'the ground holds it up',
  fullPower: 'at full power',
  highest: 'highest',
  /** The words every chapter's numbers are written in. */
  glossary: [
    'A newton (N) measures a push or a pull. A kilonewton (kN) is 1,000 newtons.',
    'm/s² is how much faster something goes every second. Gravity pulls with less of it the higher you go.',
    '√ means square root: the number that, multiplied by itself, makes the number inside.',
  ],
} as const;

/** Marks up the height ruler, with how high each one is. */
const landmarks = [
  { km: 11, label: 'airliners' },
  { km: 100, label: 'space begins' },
  { km: 400, label: 'space station' },
] as const;

export const liftOffCopy = {
  id: 'lift-off',
  title: 'The Invisible Anchor',
  lede: 'Gravity pulls everything toward the middle of the Earth. A rocket lifts off only when its engine pushes harder than that pull. When the engine stops, gravity slows it and brings it back down. Only a rocket faster than escape speed never returns.',
  drawing: 'A pencil drawing of a rocket on a launch pad, with Earth below and a height ruler up the side.',
  button: 'Hold to fire the engine',
  landmarks,
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
    braking: 'The engine is slowing the fall.',
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
    faster: 'faster than escape speed',
    slower: 'slower than escape speed',
  },
  notes: ['Most rockets never need escape speed: chapter three goes sideways instead, and chapter four comes back on purpose.'],
  keptSimple: 'Kept simple: the rocket flies straight up, time is sped up, and there is no air, no spinning Earth and no fuel getting used up.',
} as const;

export const stagingCopy = {
  id: 'staging',
  title: 'Lighter and Faster',
  lede: 'Most of a rocket is fuel. As the engine burns it, the rocket gets lighter, so the same push speeds it up more and more. An empty tank is only dead weight, so rockets are built in stages: when one runs dry, it drops off and the next engine takes over.',
  drawing: 'A pencil drawing of a two-stage rocket on a launch pad, with a fuel gauge in each stage.',
  button: 'Hold to fire the engine',
  landmarks,
  status: {
    ready: 'Two stages on the pad, full of fuel.',
    straining: 'The engine is on, but not pushing harder than gravity yet.',
    first: 'Stage one is burning fuel: lighter every second, so faster every second.',
    dropped: 'Stage one is empty. It drops away, and stage two takes over.',
    second: 'Stage two is burning, with no empty tank to carry.',
    slowing: 'The engine is on, but gravity is still winning. The climb is slowing.',
    burnout: (speed: string) => `Every drop of fuel used: top speed ${speed}.`,
    coasting: 'Engine off. Gravity is slowing it down.',
    falling: 'Falling back: going straight up, even two stages are too slow to escape.',
    landed: (speed: string) => `Back on the ground, landing at ${speed}.`,
  },
  working: {
    mass: 'Mass: rocket and the fuel left in it',
    net: 'Push − pull',
    speedUp: 'Speed gained each second = (push − pull) ÷ mass',
    motion: 'Speed and height',
    compare: 'Top speed, burning all the fuel',
    twoStages: 'two stages',
    oneStage: 'one stage',
  },
  notes: ['Falcon 9 is built the same way, in two stages. Its first stage is the one that comes back to land, in chapter four.'],
  keptSimple: 'Kept simple: it flies straight up, time is sped up, and there is no air.',
} as const;

export const orbitCopy = {
  id: 'orbit',
  title: 'Falling Around the World',
  lede: 'Isaac Newton imagined a cannon on a mountain so tall it pokes out of the air. Fire it gently and the ball curves down to the ground. Fire it faster and it lands further away, until it goes so fast that the ground curves away beneath it as fast as it falls. It never lands: it is in orbit.',
  drawing: 'A pencil drawing of the whole Earth, with a cannon on a very tall mountain at the top.',
  button: 'Hold to load the cannon',
  release: 'Let go to fire',
  ring: (height: string) => `space station · ${height}`,
  cannon: 'Newton’s cannon',
  status: {
    ready: (height: string) => `The cannon is ${height} up, as high as the space station flies. Hold to load it.`,
    falls: 'Too slow: it would curve down to the ground.',
    orbits: 'Fast enough to keep falling around the Earth.',
    escapes: 'Faster than escape speed: it would leave for good.',
    flying: 'Curving down towards the ground…',
    leaving: 'Faster than escape speed: it is leaving for good.',
    landed: (distance: string) => `Landed ${distance} round the Earth.`,
    orbiting: (time: string) => `In orbit: once round the Earth every ${time}.`,
    escaped: 'Gone for good: gravity can slow it, but never bring it back.',
  },
  working: {
    speed: 'Speed of the throw',
    circle: 'Speed to circle at this height = √(gravity × distance from Earth’s centre)',
    escape: 'Escape speed = √(2 × gravity × distance from Earth’s centre)',
    where: 'Where it goes',
    lands: (distance: string) => `lands ${distance} away`,
    orbits: (time: string) => `round the Earth every ${time}`,
    escapes: 'away for good',
  },
  notes: ['The space station does exactly this: always falling, but moving sideways so fast that it keeps missing the Earth.'],
  keptSimple: 'Kept simple: there is no air, and no mountain is that tall — Everest is under 9 km.',
} as const;

export const landingCopy = {
  id: 'landing',
  title: 'Coming Home',
  lede: 'A reusable booster falls back from high above the sea and lands on a ship. Its engine can slow it down but cannot hold it still, so the burn has to be timed: zero speed just as the legs touch the deck. Too early and it stops in mid-air; too late and it hits hard.',
  drawing: 'A pencil drawing of a rocket booster falling towards a landing ship at sea.',
  button: { ready: 'Drop the booster', flying: 'Hold to fire the engine', down: 'Drop it again' },
  status: {
    ready: (height: string) => `The booster is ${height} up. Drop it, then fire the engine to land it.`,
    falling: 'Falling. Fire when the distance it needs to stop reaches its height.',
    braking: 'The engine is slowing the fall.',
    rising: 'Going back up: let go!',
    empty: 'Out of fuel, and still in the air.',
    soft: (speed: string) => `A soft landing, at ${speed}.`,
    hard: (speed: string) => `Touched down at ${speed}: too hard.`,
  },
  working: {
    weight: 'Gravity’s pull (weight) = mass × gravity',
    net: 'Push − pull',
    stop: 'Distance needed to stop = speed² ÷ (2 × slowing)',
    fuel: 'Fuel left',
    motion: 'Speed and height',
    atFullPower: 'at full power',
    cannotStop: 'it cannot stop',
  },
  notes: [
    'speed² means speed × speed. Slowing is how much speed the engine takes off each second, at full power.',
    'Falcon 9’s first stage lands like this, on a ship at sea or back on land.',
  ],
  keptSimple: 'Kept simple: there is no air. A real booster also uses the air to slow down before it fires.',
} as const;

/** The chapters, in order. */
export const rocketChapters = [liftOffCopy, stagingCopy, orbitCopy, landingCopy] as const;
export type RocketChapterId = (typeof rocketChapters)[number]['id'];
