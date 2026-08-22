/**
 * THE WORLD — New York, in metres, at something close to its real size.
 *
 * ==================================================================
 * THE COORDINATE SYSTEM IS THE MANHATTAN GRID
 * ==================================================================
 *
 * `x` runs crosstown, positive east. `z` runs uptown, positive north. `y` is
 * height. All in metres.
 *
 * Those axes are the *street grid's*, not the compass's. The 1811 Commissioners'
 * Plan laid Manhattan out on a grid rotated about 29° east of true north, which
 * is why "uptown" is really north-northeast, why Broadway cutting across it at
 * an angle produces the triangular squares — Times, Herald, Union, Madison —
 * and why the sunset lines up with the cross-streets twice a year. Working in
 * grid coordinates means an avenue runs straight up +z and the camera can just
 * look along it; the 29° is carried as `GRID_BEARING` for anything that needs
 * true north, which so far is only the sun.
 *
 * ==================================================================
 * THE NUMBERS ARE THE REAL NUMBERS
 * ==================================================================
 *
 * Twenty blocks to the mile, so a cross-street block is 1609/20 = 80.5 m. That
 * one figure sets the entire scale of the island, and it is why the numbered
 * streets can be used directly as a coordinate: `blockZ(42)` is Times Square.
 *
 * Landmark heights are the published ones — the Empire State is 381 m to the
 * roof and 443 m to the tip of the mast, and those are different numbers for a
 * reason. Central Park is 4.10 km by 830 m, which is 3.41 km², which is the
 * 843 acres it is always quoted as — and the 830 m is not chosen, it is the
 * distance from Fifth Avenue to Eighth.
 *
 * This matters more than it sounds. A skyline is recognised by *proportion* —
 * the Chrysler against the Empire State, the gap where Central Park is, the
 * absurd thinness of the Billionaires' Row towers. Get the ratios wrong and it
 * reads as a generic city, however carefully it is drawn.
 *
 * The one deliberate departure: the numbered grid is treated as linear all the
 * way up, where above Harlem the real numbering stops being uniform. With the
 * unnumbered downtown measured separately from the Battery, the island comes
 * out at 21.1 km against a true 21.6, and nothing in this drawing ever goes far
 * enough north for the difference to show.
 */

/** Cross-street spacing: twenty blocks to the mile. */
export const BLOCK = 1609.344 / 20;

/** How far the street grid is rotated east of true north. */
export const GRID_BEARING = (29 * Math.PI) / 180;

/** The z of a numbered cross street. 42nd is the origin — Times Square. */
export const blockZ = (street: number) => (street - 42) * BLOCK;

/**
 * The southern tip of the island.
 *
 * Everything below Houston Street predates the 1811 grid — those are colonial
 * streets with names, laid along cow paths and shorelines, and they are not on
 * any numbering. So the Battery cannot be addressed as `blockZ(0)`: the walk
 * from Houston down to the water is 3.2 km, which the grid would have counted
 * as 40 blocks that do not exist.
 *
 * Getting this wrong put City Hall five kilometres out in the harbour, with the
 * Brooklyn Bridge starting from open water. Downtown is measured in metres from
 * here instead.
 */
export const BATTERY_Z = blockZ(0) - 3200;

/** Metres north of the Battery, for anything below the numbered grid. */
export const downtownZ = (north: number) => BATTERY_Z + north;

/**
 * Avenue positions, in metres east of Fifth.
 *
 * Not evenly spaced, and that is the point. The west-side avenues sit about
 * 275 m apart; Madison, Park and Lexington were squeezed in on the east side
 * later at roughly 150 m, which is why the crosstown walk from First to Fifth
 * is nothing like the walk from Fifth to Eighth. That asymmetry is legible from
 * the air and it is worth having.
 *
 * The spacing also fixes the width of Central Park, since the park is exactly
 * the distance from Fifth Avenue to Eighth.
 *
 * Broadway is not in this table because it is not on the grid — it is the old
 * Wickquasgeck trail, and it cuts across everything at an angle. That is what
 * makes the triangular squares, Times among them.
 */
export const AVENUE = {
  westSt: -1730,
  eleventh: -1520,
  tenth: -1290,
  ninth: -1060,
  /** Central Park West, alongside the park. */
  eighth: -830,
  seventh: -553,
  sixth: -277,
  fifth: 0,
  madison: 150,
  park: 300,
  lexington: 455,
  third: 610,
  second: 840,
  first: 1070,
  fdr: 1290,
} as const;

export type District =
  | 'midtown'
  | 'financial'
  | 'billionaires'
  | 'village'
  | 'harlem'
  | 'brooklyn'
  | 'queens'
  | 'bronx'
  | 'statenIsland';

/* ------------------------------------------------------------------ *
 * Land and water
 * ------------------------------------------------------------------ */

export type Ring = [number, number][];

/**
 * Manhattan's outline, as a ring in the xz plane.
 *
 * Traced coarsely — enough vertices that the Battery comes to a point, the
 * island bulges at Midtown and narrows at the Village, and Harlem runs off the
 * top. A shoreline drawn with four corners reads as a runway.
 */
export const MANHATTAN: Ring = [
  [-240, downtownZ(0)], // the Battery, where the two rivers meet
  [-760, downtownZ(760)],
  [-1220, downtownZ(1650)],
  [-1560, downtownZ(2500)],
  [-1800, blockZ(14)],
  [-1770, blockZ(40)],
  [-1800, blockZ(70)],
  [-1820, blockZ(100)],
  [-1870, blockZ(130)],
  [-1900, blockZ(160)],
  [-1770, blockZ(186)],
  [-1450, blockZ(202)],
  [-1050, blockZ(214)],
  [-600, blockZ(222)],
  [-200, blockZ(218)],
  [120, blockZ(200)],
  [420, blockZ(178)],
  [700, blockZ(154)],
  [980, blockZ(130)],
  [1180, blockZ(106)],
  [1320, blockZ(84)],
  [1370, blockZ(60)],
  [1400, blockZ(38)],
  [1450, blockZ(16)],
  [1290, blockZ(2)],
  [1000, downtownZ(2500)],
  [640, downtownZ(1500)],
  [200, downtownZ(400)],
];

/** Roosevelt Island, in the East River. Long, thin, and unmistakable. */
export const ROOSEVELT: Ring = [
  [1510, blockZ(46)],
  [1630, blockZ(50)],
  [1670, blockZ(76)],
  [1610, blockZ(90)],
  [1520, blockZ(86)],
  [1480, blockZ(58)],
];

/** Liberty Island, out in the Upper Bay. */
export const LIBERTY_ISLAND: Ring = [
  [-2620, downtownZ(-1290)],
  [-2440, downtownZ(-1250)],
  [-2390, downtownZ(-1440)],
  [-2510, downtownZ(-1560)],
  [-2660, downtownZ(-1470)],
];

/** Governors Island. */
export const GOVERNORS: Ring = [
  [-20, downtownZ(-780)],
  [420, downtownZ(-720)],
  [520, downtownZ(-1180)],
  [220, downtownZ(-1420)],
  [-80, downtownZ(-1190)],
];

/**
 * The other boroughs, as coarse landmasses.
 *
 * They exist to be the far bank — the thing a bridge crosses to and the low
 * spread behind the towers. Nothing walks on them, so they are outlines and
 * building density, not geography.
 */
export const BOROUGH: Record<string, { ring: Ring; district: District }> = {
  brooklyn: {
    district: 'brooklyn',
    ring: [
      [1560, blockZ(6)],
      [2600, blockZ(14)],
      [4800, downtownZ(2600)],
      [6200, downtownZ(-900)],
      [5400, downtownZ(-7200)],
      [1500, downtownZ(-8200)],
      [700, downtownZ(-3000)],
      [900, downtownZ(600)],
    ],
  },
  queens: {
    district: 'queens',
    ring: [
      [1500, blockZ(14)],
      [3400, blockZ(30)],
      [5800, blockZ(52)],
      [6400, blockZ(120)],
      [4200, blockZ(150)],
      [2100, blockZ(120)],
      [1420, blockZ(64)],
    ],
  },
  bronx: {
    district: 'bronx',
    ring: [
      [-900, blockZ(226)],
      [900, blockZ(232)],
      [2800, blockZ(258)],
      [3200, blockZ(320)],
      [-600, blockZ(316)],
      [-1200, blockZ(262)],
    ],
  },
  statenIsland: {
    district: 'statenIsland',
    ring: [
      [-4200, downtownZ(-6200)],
      [-1300, downtownZ(-5600)],
      [-500, downtownZ(-8600)],
      [-2100, downtownZ(-12200)],
      [-5000, downtownZ(-10600)],
    ],
  },
};

/** New Jersey. The far bank of the Hudson, and nothing more. */
export const JERSEY: Ring = [
  [-2450, downtownZ(-400)],
  [-2380, blockZ(20)],
  [-2420, blockZ(90)],
  [-2560, blockZ(160)],
  [-2700, blockZ(240)],
  [-8000, blockZ(250)],
  [-8000, downtownZ(-2000)],
];

/* ------------------------------------------------------------------ *
 * Central Park
 * ------------------------------------------------------------------ */

/**
 * 59th to 110th, Fifth Avenue to Central Park West. 4.07 km by 860 m, which is
 * the 843 acres.
 *
 * The features inside it are the ones that read from the air: the Reservoir's
 * unmistakable oval, the Lake's ragged southern edge, the Great Lawn, and the
 * loop road. The "lazy river" is the Lake and the Ravine — the park has no
 * river, it has a chain of water bodies fed from the city mains, which is
 * itself a better fact than a river would have been.
 */
export const PARK = {
  south: blockZ(59),
  north: blockZ(110),
  /** Central Park West. */
  west: AVENUE.eighth,
  /** Fifth Avenue. */
  east: AVENUE.fifth,
} as const;

export const PARK_WATER: { name: string; ring: Ring }[] = [
  {
    name: 'the Pond',
    ring: [
      [-760, blockZ(59.6)],
      [-620, blockZ(60.4)],
      [-540, blockZ(61.8)],
      [-640, blockZ(62.6)],
      [-790, blockZ(61.4)],
    ],
  },
  {
    name: 'the Lake',
    ring: [
      [-790, blockZ(72)],
      [-620, blockZ(71.3)],
      [-480, blockZ(72.4)],
      [-330, blockZ(73.8)],
      [-450, blockZ(75.2)],
      [-640, blockZ(74.6)],
      [-780, blockZ(75.4)],
      [-815, blockZ(73.4)],
    ],
  },
  {
    name: 'the Ravine',
    ring: [
      [-760, blockZ(101)],
      [-620, blockZ(102.6)],
      [-500, blockZ(104.6)],
      [-560, blockZ(105.4)],
      [-680, blockZ(103.6)],
      [-800, blockZ(102)],
    ],
  },
  {
    name: 'Jacqueline Kennedy Onassis Reservoir',
    ring: (() => {
      // A true ellipse, because that is what it is. The running track on its rim
      // is quoted at 1.58 miles, which is what fixes these two radii.
      const cx = -415;
      const cz = blockZ(91);
      const rx = 360;
      const rz = 430;
      const out: Ring = [];
      for (let i = 0; i < 28; i += 1) {
        const a = (i / 28) * Math.PI * 2;
        out.push([cx + Math.cos(a) * rx, cz + Math.sin(a) * rz]);
      }
      return out;
    })(),
  },
];

export const PARK_GREEN: { name: string; ring: Ring }[] = [
  {
    name: 'the Great Lawn',
    ring: [
      [-640, blockZ(80.5)],
      [-330, blockZ(80.8)],
      [-300, blockZ(84.6)],
      [-610, blockZ(85)],
    ],
  },
  {
    name: 'Sheep Meadow',
    ring: [
      [-770, blockZ(66.4)],
      [-560, blockZ(66.8)],
      [-540, blockZ(69.6)],
      [-760, blockZ(69.2)],
    ],
  },
  {
    name: 'the Ramble',
    ring: [
      [-700, blockZ(75.6)],
      [-420, blockZ(76)],
      [-400, blockZ(79.4)],
      [-690, blockZ(79)],
    ],
  },
];

/* ------------------------------------------------------------------ *
 * Bridges
 * ------------------------------------------------------------------ */

export type Bridge = {
  name: string;
  kind: 'suspension' | 'cantilever' | 'arch';
  /** Deck ends, in world metres. */
  from: [number, number];
  to: [number, number];
  /** Height of the deck above the water at mid-span. */
  deck: number;
  /** Tower height above the water. Zero for a cantilever. */
  tower: number;
  /** Main span, metres — the distance between the towers. */
  span: number;
  /** Deck width. */
  width: number;
};

/**
 * The crossings, at their published spans.
 *
 * The Brooklyn Bridge's 486 m main span made it the longest in the world in
 * 1883 by half again, and its towers are masonry, which is why they read as
 * solid gothic arches rather than steel lattice. The George Washington's 1067 m
 * doubled the record in 1931. Those two numbers are most of why the two bridges
 * look nothing like each other.
 */
export const BRIDGES: Bridge[] = [
  {
    name: 'Brooklyn Bridge',
    kind: 'suspension',
    from: [560, downtownZ(1550)],
    to: [1820, downtownZ(1230)],
    deck: 38,
    tower: 84,
    span: 486,
    width: 26,
  },
  {
    name: 'Manhattan Bridge',
    kind: 'suspension',
    from: [680, downtownZ(1950)],
    to: [1900, downtownZ(1700)],
    deck: 41,
    tower: 102,
    span: 448,
    width: 36,
  },
  {
    name: 'Williamsburg Bridge',
    kind: 'suspension',
    from: [1200, blockZ(2)],
    to: [2280, blockZ(0)],
    deck: 41,
    tower: 102,
    span: 488,
    width: 36,
  },
  {
    name: 'Queensboro Bridge',
    kind: 'cantilever',
    from: [1300, blockZ(59)],
    to: [2450, blockZ(62)],
    deck: 40,
    tower: 106,
    span: 360,
    width: 30,
  },
  {
    name: 'George Washington Bridge',
    kind: 'suspension',
    from: [-1790, blockZ(178)],
    to: [-3120, blockZ(180)],
    deck: 65,
    tower: 184,
    span: 1067,
    width: 36,
  },
  {
    name: 'Verrazzano-Narrows Bridge',
    kind: 'suspension',
    from: [1550, downtownZ(-7600)],
    to: [-1000, downtownZ(-7600)],
    deck: 69,
    tower: 211,
    span: 1298,
    width: 31,
  },
];

/* ------------------------------------------------------------------ *
 * Landmarks
 * ------------------------------------------------------------------ */

export type LandmarkShape =
  | 'setback'      // a 1916 ziggurat
  | 'artdeco'      // crowned, stepped, a mast
  | 'chrysler'     // the terraced arches
  | 'slab'         // a flat modern box
  | 'pencil'       // Billionaires' Row: absurdly thin
  | 'tapered'      // One WTC's rotating square
  | 'flatiron'     // a wedge
  | 'dome'
  | 'statue';

export type Landmark = {
  id: string;
  name: string;
  x: number;
  z: number;
  /** Footprint, metres. */
  width: number;
  depth: number;
  /** Height to the roof. */
  height: number;
  /** Height to the tip of any mast or spire, if taller than the roof. */
  tip?: number;
  shape: LandmarkShape;
  district: District;
};

/**
 * The buildings the skyline is recognised by.
 *
 * Everything else in the city is generated fill. These are placed by hand at
 * their real addresses and their real heights, because they are the reason a
 * silhouette reads as New York rather than as a city.
 *
 * Note the two numbers on the Empire State: 381 m of building, then 62 m of
 * mooring mast and antenna on top. The mast was sold as a dock for airships,
 * which was never once used as intended, and it is the single most recognisable
 * 62 metres in the world.
 */
export const LANDMARKS: Landmark[] = [
  {
    id: 'empire-state',
    name: 'Empire State Building',
    x: AVENUE.fifth - 40,
    z: blockZ(34),
    width: 129,
    depth: 61,
    height: 381,
    tip: 443,
    shape: 'artdeco',
    district: 'midtown',
  },
  {
    id: 'chrysler',
    name: 'Chrysler Building',
    x: AVENUE.lexington - 30,
    z: blockZ(42.5),
    width: 61,
    depth: 61,
    height: 282,
    tip: 319,
    shape: 'chrysler',
    district: 'midtown',
  },
  {
    id: 'one-wtc',
    name: 'One World Trade Center',
    x: -900,
    z: downtownZ(1900),
    width: 62,
    depth: 62,
    height: 417,
    tip: 541,
    shape: 'tapered',
    district: 'financial',
  },
  {
    id: 'rockefeller',
    name: '30 Rockefeller Plaza',
    x: AVENUE.sixth + 60,
    z: blockZ(49.5),
    width: 122,
    depth: 40,
    height: 259,
    shape: 'setback',
    district: 'midtown',
  },
  {
    id: 'central-park-tower',
    name: 'Central Park Tower',
    x: AVENUE.seventh + 30,
    z: blockZ(57.5),
    width: 44,
    depth: 44,
    height: 472,
    shape: 'pencil',
    district: 'billionaires',
  },
  {
    id: '432-park',
    name: '432 Park Avenue',
    x: AVENUE.park - 10,
    z: blockZ(56.5),
    width: 28,
    depth: 28,
    height: 426,
    shape: 'pencil',
    district: 'billionaires',
  },
  {
    id: 'steinway',
    name: '111 West 57th Street',
    x: AVENUE.sixth - 40,
    z: blockZ(57),
    width: 18,
    depth: 60,
    height: 435,
    shape: 'pencil',
    district: 'billionaires',
  },
  {
    id: 'bank-of-america',
    name: 'One Bryant Park',
    x: AVENUE.sixth - 20,
    z: blockZ(43),
    width: 70,
    depth: 70,
    height: 288,
    tip: 366,
    shape: 'tapered',
    district: 'midtown',
  },
  {
    id: 'flatiron',
    name: 'Flatiron Building',
    x: AVENUE.fifth - 30,
    z: blockZ(23),
    width: 58,
    depth: 58,
    height: 87,
    shape: 'flatiron',
    district: 'village',
  },
  {
    id: 'met-life',
    name: 'MetLife Building',
    x: AVENUE.park - 5,
    z: blockZ(45),
    width: 90,
    depth: 60,
    height: 246,
    shape: 'slab',
    district: 'midtown',
  },
  {
    id: 'hudson-yards',
    name: '30 Hudson Yards',
    x: AVENUE.eleventh + 40,
    z: blockZ(33),
    width: 60,
    depth: 60,
    height: 387,
    shape: 'slab',
    district: 'midtown',
  },
  {
    id: 'woolworth',
    name: 'Woolworth Building',
    x: -520,
    z: downtownZ(2120),
    width: 45,
    depth: 60,
    height: 241,
    shape: 'setback',
    district: 'financial',
  },
  {
    id: 'liberty',
    name: 'Statue of Liberty',
    x: -2515,
    z: downtownZ(-1390),
    width: 30,
    depth: 30,
    height: 93,
    shape: 'statue',
    district: 'financial',
  },
];

/* ------------------------------------------------------------------ *
 * Districts
 * ------------------------------------------------------------------ */

export type DistrictSpec = {
  /** Typical roof heights, metres. */
  low: number;
  high: number;
  /** Chance a block gets a tower well above `high`. */
  towerChance: number;
  /** Typical footprint along the street. */
  frontage: [number, number];
  /** How much of each block is built on. */
  coverage: number;
  /** Palette key, resolved by the renderer. */
  tone: 'warm' | 'cool' | 'brick' | 'pale';
};

/**
 * What each part of the city is made of.
 *
 * These are the differences you can see from a helicopter: the Village is a low
 * even brick carpet with water towers on it; Midtown is a wall; the Financial
 * District is the same wall but tighter and on crooked colonial streets;
 * Billionaires' Row is six absurd needles in a row along 57th.
 */
export const DISTRICTS: Record<District, DistrictSpec> = {
  midtown: { low: 45, high: 180, towerChance: 0.22, frontage: [30, 70], coverage: 0.86, tone: 'pale' },
  financial: { low: 50, high: 210, towerChance: 0.26, frontage: [22, 55], coverage: 0.9, tone: 'cool' },
  billionaires: { low: 60, high: 250, towerChance: 0.4, frontage: [20, 40], coverage: 0.7, tone: 'pale' },
  village: { low: 14, high: 28, towerChance: 0.03, frontage: [7, 18], coverage: 0.82, tone: 'brick' },
  harlem: { low: 15, high: 34, towerChance: 0.06, frontage: [8, 20], coverage: 0.78, tone: 'brick' },
  brooklyn: { low: 10, high: 26, towerChance: 0.05, frontage: [8, 22], coverage: 0.7, tone: 'brick' },
  queens: { low: 9, high: 22, towerChance: 0.04, frontage: [9, 24], coverage: 0.62, tone: 'warm' },
  bronx: { low: 11, high: 26, towerChance: 0.04, frontage: [9, 24], coverage: 0.6, tone: 'brick' },
  statenIsland: { low: 7, high: 14, towerChance: 0.01, frontage: [10, 26], coverage: 0.4, tone: 'warm' },
};

/** Which district a point falls in. */
export function districtAt(x: number, z: number): District {
  if (x > 1500) return z > blockZ(10) ? 'queens' : 'brooklyn';
  if (z > blockZ(224)) return 'bronx';
  if (x < -1900) return 'statenIsland';
  if (z > blockZ(110)) return 'harlem';
  if (z > blockZ(53) && z < blockZ(60) && x > AVENUE.eighth && x < AVENUE.park) return 'billionaires';
  if (z > blockZ(30)) return 'midtown';
  if (z > downtownZ(2600)) return 'village';
  return 'financial';
}

/* ------------------------------------------------------------------ *
 * Geometry helpers
 * ------------------------------------------------------------------ */

/** Point in ring, by the even-odd rule. */
export function inRing(ring: Ring, x: number, z: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, zi] = ring[i];
    const [xj, zj] = ring[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** Is this point inside Central Park? */
export function inPark(x: number, z: number): boolean {
  return x > PARK.west && x < PARK.east && z > PARK.south && z < PARK.north;
}

/** Is this point on Manhattan, and not in the park? */
export function buildable(x: number, z: number): boolean {
  return inRing(MANHATTAN, x, z) && !inPark(x, z);
}

/** Bounding box of a ring, for culling. */
export function ringBounds(ring: Ring) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const [x, z] of ring) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  return { minX, maxX, minZ, maxZ };
}
