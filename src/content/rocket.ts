/**
 * The words on the rocket-physics entry: one trip, pad to Moon. The numbers
 * beside them are computed by `lib/rocket/`; nothing here states a figure —
 * where a line needs one, it is a function the page fills in.
 */

export const rocketCopy = {
  title: 'From the Pad to the Moon',
  lede: 'Press lift off and follow one rocket all the way: up through the air, into orbit, three days across to the Moon and down onto it — while its booster turns round and flies home to be caught.',
  drawing: 'A pencil drawing of the trip: a rocket climbing from its launch tower, into orbit round the Earth, across to the Moon and down onto it.',
  split: 'The booster, flying home',
  sound: 'Sound',
  cursor: 'Go',
  button: { ready: 'Lift off', playing: 'Pause', paused: 'Play', done: 'Watch again' },
  clock: (time: string) => `T+ ${time}`,
  up: 'up',
  down: 'down',
  groundHolds: 'the ground holds it up',
  steps: 'Steps of the trip',

  /** The strip of steps under the drawing; each jumps to its moment. */
  phases: [
    { at: 'liftoff', label: 'Lift-off' },
    { at: 'separation', label: 'Separation' },
    { at: 'boostback', label: 'Booster home' },
    { at: 'orbit', label: 'Orbit' },
    { at: 'docked', label: 'Refuel' },
    { at: 'moonBurn', label: 'To the Moon' },
    { at: 'descent', label: 'Landing' },
  ],

  /** Dashed heights on the sky. */
  heights: [
    { km: 11, label: 'airliners · 11 km' },
    { km: 100, label: 'space begins · 100 km' },
  ],
  earth: 'Earth',
  moon: 'Moon',
  /** The arrows beside the rocket at lift-off. */
  arrows: { push: 'push', pull: 'pull' },

  /** What is happening, one line at a time. */
  beats: {
    ready: 'On the pad. The engines must push harder than gravity pulls.',
    liftoff: 'Lift-off! The push beats the pull.',
    climb: 'Tipping east as it climbs: going sideways is what will keep it up.',
    separation: (height: string) => `${height} up, above almost all the air: the booster lets go.`,
    toOrbit: 'The ship keeps burning, flatter and faster, while the booster flies home.',
    caught: 'Caught! The tower’s arms close round the booster.',
    orbit: 'Engine off. Fast enough sideways to keep falling round the Earth: in orbit.',
    refuel: 'Its tanks are nearly empty, so a tanker docks and fills them.',
    moonBurn: 'Burn! Almost fast enough to escape the Earth — the Moon’s pull will do the rest.',
    coast: 'Coasting to the Moon. Gravity does all the steering.',
    arrive: 'Behind the Moon, a braking burn. Without it, the ship would fly straight past.',
    moonOrbit: (lap: string) => `Circling the Moon, once every ${lap}.`,
    dip: 'A small burn, to swoop down to 15 km on the far side.',
    descent: 'Down to the ground, slowing all the way.',
    landed: (time: string) => `Touchdown on the Moon, ${time} after lift-off.`,
  },

  /** The working, line by line, in words first. */
  working: {
    weight: 'Gravity’s pull (weight) = mass × gravity',
    thrust: 'Engines’ push',
    net: 'Push − pull',
    motion: 'Speed and height',
    circle: 'Speed to circle the Earth here = √(gravity × distance from Earth’s centre)',
    sideways: 'Ship’s speed sideways',
    booster: 'Booster: speed and height',
    caughtAt: (time: string) => `caught by the tower at T+ ${time}`,
    fuel: 'Fuel in the ship’s tanks',
    speed: 'Speed',
    escape: 'Escape speed here = √(2 × gravity × distance from Earth’s centre)',
    toMoon: 'Distance to the Moon',
    moonGravity: 'Gravity at the Moon’s surface',
    share: (share: string) => `${share} of Earth’s`,
    circleMoon: 'Speed to circle the Moon here = √(its gravity there × distance from its centre)',
    moonHeight: 'Speed and height above the Moon',
  },

  notes: [
    'A made-up trip, built from real steps. SpaceX already catches Starship’s booster with the tower’s arms; refuelling in orbit and landing Starship on the Moon are planned, not yet done. The way to the Moon is Apollo 11’s.',
    'The rocket is Starship-sized: a 71 m booster and a 50 m ship. A meganewton (MN) is a million newtons of push, and a tonne (t) is 1,000 kg.',
  ],
  glossary: [
    'm/s² is how much faster something goes every second. Gravity pulls with less of it the higher you go.',
    '√ means square root: the number that, multiplied by itself, makes the number inside.',
  ],
  keptSimple: 'Kept simple: a flat slice through space, a simple sky, and no spin of the Earth or Moon. One tanker visit stands in for the several a real trip would need.',
} as const;

