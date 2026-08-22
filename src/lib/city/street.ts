/**
 * THE STREET — everything on the road you are driving down.
 *
 * ==================================================================
 * EVERYTHING IS PARAMETERISED BY DISTANCE ALONG THE ROUTE
 * ==================================================================
 *
 * Cars, lamps, signals and gantries are all placed by *how far along the drive
 * they are*, plus a sideways offset. Not by world coordinates.
 *
 * That one decision is what makes the whole thing work on a road that turns.
 * A car at 4,120 m is on the road at 4,120 m — whether that is an avenue, a
 * cross street or the deck of the Brooklyn Bridge. It goes round corners because
 * the road does. It climbs the bridge because the road does. Nothing needs to
 * know which of those it is on, and there is no case where a car carries
 * straight on through a turn because its heading was authored somewhere else.
 *
 * It also bounds the work exactly: only the stretch of road near the camera is
 * populated, and things that fall out of the back of that window are recycled
 * to the front of it. Sixty cars exist at any moment, however long the drive.
 *
 * ==================================================================
 * THE CAR-FOLLOWING IS THE SAME IDM
 * ==================================================================
 *
 * Gaps are measured along the route rather than in a straight line, which is
 * the correct measure — two cars either side of a corner are as far apart as
 * the road between them, not as the crow flies. Using straight-line distance
 * makes cars brake for vehicles on the far side of a bend they cannot reach.
 */

import { at, offsetFrom, type Route, type RoutePoint } from './route';
import { VEHICLES, idmAcceleration, V0, type VehicleKind } from './traffic';
import { BLOCK, blockZ } from './world';

/** Lane width, US urban standard. */
export const LANE = 3.35;

/** How far ahead and behind the camera the road is populated. */
export const WINDOW = { back: 220, front: 700 };

export type RoadCar = {
  id: number;
  kind: VehicleKind;
  /** Metres along the route. */
  s: number;
  /** Speed along the route, m/s. Always positive; `dir` carries the sense. */
  v: number;
  v0: number;
  /** +1 travels with the camera, −1 against it. */
  dir: 1 | -1;
  /**
   * Which lane, as an index.
   *
   * Not the lateral offset. Cars carry a few centimetres of jitter so they do
   * not sit on one perfect line, and grouping by the jittered offset put every
   * car in a lane of its own — so no car ever found a leader, the
   * car-following model never engaged at all, and they drove through each
   * other at the speed limit. The index is what the lane IS; the offset is
   * where this car happens to sit in it.
   */
  lane: number;
  /** Lateral offset from the centreline, metres. */
  lateral: number;
  seed: number;
};

export type Traffic = {
  cars: RoadCar[];
  next: number;
  /** Where the window was last centred. */
  centre: number;
};

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cabs are about a quarter of the traffic on a Manhattan avenue, and it shows. */
const MIX: VehicleKind[] = ['cab', 'sedan', 'cab', 'suv', 'cab', 'sedan', 'van', 'suv', 'sedan', 'bus'];

const random = rng(0x1811);

/** The lanes, as lateral offsets. Driving on the right. */
export function lanesFor(oneWay: boolean): { lateral: number; dir: 1 | -1 }[] {
  if (oneWay) {
    // A one-way avenue: four or five lanes, all the same way. It is why an
    // avenue feels nothing like a two-way street.
    return [
      { lateral: LANE * 1.5, dir: 1 },
      { lateral: LANE * 0.5, dir: 1 },
      { lateral: -LANE * 0.5, dir: 1 },
      { lateral: -LANE * 1.5, dir: 1 },
    ];
  }
  return [
    { lateral: LANE * 1.5, dir: 1 },
    { lateral: LANE * 0.5, dir: 1 },
    { lateral: -LANE * 0.5, dir: -1 },
    { lateral: -LANE * 1.5, dir: -1 },
  ];
}

export function makeTraffic(): Traffic {
  return { cars: [], next: 0, centre: Number.NaN };
}

/**
 * Keep the window populated, and step everything in it.
 *
 * Cars that leave the window are recycled to the far end rather than destroyed
 * and rebuilt, so the population is stable and nothing is allocated per frame.
 */
export function stepTraffic(
  traffic: Traffic,
  route: Route,
  cameraD: number,
  dt: number,
  oneWay: boolean,
  cameraLane = LANE * 0.55,
): void {
  const from = cameraD - WINDOW.back;
  const to = cameraD + WINDOW.front;
  const lanes = lanesFor(oneWay);

  /* ---- populate ---- */
  // One car per lane per 42 m is moderate traffic — about a three-second
  // headway at the limit.
  const target = Math.min(74, Math.round(((to - from) / 42) * lanes.length));
  while (traffic.cars.length < target) {
    const lane = lanes[traffic.cars.length % lanes.length];
    traffic.cars.push({
      id: traffic.next++,
      kind: MIX[Math.floor(random() * MIX.length)],
      s: from + random() * (to - from),
      v: V0 * (0.5 + random() * 0.5),
      v0: V0 * (0.84 + random() * 0.34),
      dir: lane.dir,
      lane: traffic.cars.length % lanes.length,
      lateral: lane.lateral + (random() - 0.5) * 0.5,
      seed: Math.floor(random() * 1e6),
    });
  }
  if (traffic.cars.length > target) traffic.cars.length = target;

  /* ---- step, lane by lane ---- */
  const byLane = new Map<number, RoadCar[]>();
  for (const car of traffic.cars) {
    const list = byLane.get(car.lane);
    if (list) list.push(car);
    else byLane.set(car.lane, [car]);
  }

  for (const list of byLane.values()) {
    // Sorted in the direction of travel, so "the next one" is the leader.
    list.sort((a, b) => (a.dir === 1 ? a.s - b.s : b.s - a.s));

    for (let i = 0; i < list.length; i += 1) {
      const car = list[i];
      const leader = list[i + 1];

      let gap = leader ? Math.abs(leader.s - car.s) - VEHICLES[leader.kind].length : 1e4;
      let closing = leader ? car.v - leader.v : 0;

      // The next signal ahead, as a stopped phantom car at the stop line. Only
      // on the level — nobody stops halfway across a bridge.
      const point = at(route, car.s);
      if (Math.abs(point.y) < 1.5) {
        const ahead = nextSignal(point, car.dir);
        if (ahead !== null && ahead < gap && ahead >= 0) {
          const state = signalPhase(point.z, car.s);
          if (state === 'red') {
            gap = ahead;
            closing = car.v;
          }
        }
      }

      const a = idmAcceleration(car.v, Math.max(gap, 0.05), closing, car.v0);
      const vNext = Math.max(0, car.v + a * dt);
      // Trapezoidal: exact for a constant acceleration over the step, and
      // unlike plain Euler it will not let a braking car pass through the one
      // in front when the step is large.
      car.s += car.dir * ((car.v + vNext) / 2) * dt;
      car.v = vNext;

      /*
        Recycle rather than rebuild — but behind whatever is already at that
        end, not on top of it. Dropping a car at a fixed offset puts it inside
        the last one recycled, and the pair then sit overlapped for as long as
        they are on screen.
      */
      if (car.s < from - 40) car.s = furthest(list, 1, to) + 12 + random() * 24;
      else if (car.s > to + 40) car.s = furthest(list, -1, from) - 12 - random() * 24;

      /*
        Keep the camera's own space clear.

        The camera drives in a lane, and the traffic uses the same lane offsets
        — so without this a car spawns exactly where the viewer is and the whole
        frame becomes the inside of a taxi. You cannot drive through another
        car, and the drawing should not either.

        Moved rather than deleted, so the population stays constant.
      */
      if (Math.abs(car.lateral - cameraLane) < LANE * 0.8 && Math.abs(car.s - cameraD) < 9) {
        car.s = car.dir === 1
          ? Math.max(cameraD + 26, furthest(list, 1, cameraD) + 12)
          : Math.min(cameraD - 24, furthest(list, -1, cameraD) - 12);
      }
    }
  }

  traffic.centre = cameraD;
}

/** The furthest car in a lane in a given direction, so a recycled one lands behind it. */
function furthest(list: RoadCar[], sense: 1 | -1, fallback: number): number {
  let best = fallback;
  for (const car of list) {
    if (sense === 1 ? car.s > best : car.s < best) best = car.s;
  }
  return best;
}

/** Distance to the next cross street ahead of a point, or null if far off. */
function nextSignal(point: RoutePoint, dir: 1 | -1): number | null {
  // Signals live on the numbered grid; below Houston there is no grid to be on.
  if (point.z < blockZ(0)) return null;
  const street = point.z / BLOCK + 42;
  const next = dir === 1 ? Math.ceil(street) : Math.floor(street);
  const d = Math.abs((next - 42) * BLOCK - point.z);
  return d < 200 ? d : null;
}

/** A 90 second cycle with a green wave, the way a Manhattan avenue runs. */
export function signalPhase(z: number, time: number): 'green' | 'amber' | 'red' {
  const street = Math.round(z / BLOCK + 42);
  const phase = (((time / 12 - street * 2.2) % 90) + 90) % 90;
  if (phase < 52) return 'green';
  if (phase < 56) return 'amber';
  return 'red';
}

/** Where a car is in the world, and which way it points. */
export function carPlacement(route: Route, car: RoadCar) {
  const point = at(route, car.s);
  const { x, z } = offsetFrom(point, car.lateral);
  return {
    x,
    z,
    y: point.y,
    // An oncoming car faces back down the road.
    heading: car.dir === 1 ? point.heading : point.heading + Math.PI,
  };
}

/* ------------------------------------------------------------------ *
 * Parked cars, lamps and signals
 * ------------------------------------------------------------------ */

export type Furniture = {
  kind: 'lamp' | 'parked' | 'signal';
  s: number;
  lateral: number;
  /** For parked cars. */
  vehicle?: VehicleKind;
  /** Which way a parked car points. */
  dir?: 1 | -1;
  seed: number;
};

/**
 * Everything standing at the kerb over a stretch of road.
 *
 * Derived from the distance along the route by hash, so it is the same every
 * time that stretch is looked at and there is nothing to keep in memory. Drive
 * back down the road and the same cars are parked in the same places.
 *
 * ---
 *
 * A PARKED CAR FACES THE WAY IT DROVE IN
 *
 * On a two-way street the two kerbs face opposite ways; on a one-way avenue
 * they both face the same way. What is never right is both kerbs facing the
 * same way on a two-way street, which is what falls out if you place them
 * without thinking about it — and it looks wrong immediately without being easy
 * to name.
 */
export function furnitureAlong(from: number, to: number, oneWay: boolean): Furniture[] {
  const out: Furniture[] = [];
  const kerb = LANE * 2.35;

  // Lamps every 30 m, alternating sides, which is how a roadway is lit.
  const first = Math.ceil(from / 30) * 30;
  for (let s = first; s < to; s += 30) {
    const h = hash(s, 1);
    out.push({ kind: 'lamp', s, lateral: (Math.floor(s / 30) % 2 ? 1 : -1) * kerb, seed: Math.round(h * 1e6) });
  }

  // Kerbside parking, both sides.
  for (const side of [-1, 1] as const) {
    // On a one-way street both kerbs were arrived at travelling the same way.
    const dir: 1 | -1 = oneWay ? 1 : side > 0 ? 1 : -1;
    let s = Math.ceil(from / 6) * 6 + (side > 0 ? 3 : 0);
    while (s < to) {
      const h = hash(s, side + 4);
      const kind = MIX[Math.min(MIX.length - 1, Math.floor(h * MIX.length))];
      const spec = VEHICLES[kind];
      if (kind === 'bus') {
        s += 15;
        continue;
      }
      // Hydrants, crossings and driveways: a kerb is never a solid wall of cars.
      const gap = hash(s, side + 9) < 0.22;
      if (!gap) {
        out.push({
          kind: 'parked',
          s: s + spec.length / 2,
          lateral: side * (kerb - 0.4),
          vehicle: kind,
          dir,
          seed: Math.round(h * 1e6),
        });
      }
      s += spec.length + 1.1 + hash(s, side + 14) * 1.6;
    }
  }

  return out;
}

/**
 * A hash, so a stretch of road is the same every time it is looked at.
 *
 * The multiplier on `a` matters: called with nearly-consecutive positions, a
 * weak spread puts every parking space in the same bucket and the entire kerb
 * comes out the same colour — a whole street of taxis, which is a striking
 * thing to see and not what was asked for.
 */
function hash(a: number, b: number): number {
  let h = Math.imul(Math.round(a * 8) | 0, 0x27d4eb2d) ^ Math.imul((b | 0) * 0x2545f491, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
