/**
 * The rocket: two stages in Starship's published proportions (Wikipedia,
 * "SpaceX Starship", Block 1): a Super Heavy-style booster and a ship.
 *
 * | | dry mass | propellant | thrust | exhaust speed |
 * |---|---|---|---|---|
 * | booster | 275 t | 3,250 t | 73.5 MN | 3.21 km/s (327 s at sea level) |
 * | ship | 100 t | 1,200 t | 12.3 MN | 3.70 km/s (380 s in vacuum) |
 *
 * Both are 9 m across; the booster is 71 m tall and the ship 50.3 m.
 */

export type Stage = {
  /** kg */
  dry: number;
  /** kg of propellant, full */
  fuel: number;
  /** N at full power */
  thrust: number;
  /** m/s: propellant is burnt at thrust ÷ exhaust speed kilograms a second */
  exhaust: number;
  /** m */
  length: number;
  diameter: number;
};

export const BOOSTER: Stage = { dry: 275_000, fuel: 3_250_000, thrust: 73_500_000, exhaust: 3_210, length: 71, diameter: 9 };
export const SHIP: Stage = { dry: 100_000, fuel: 1_200_000, thrust: 12_300_000, exhaust: 3_700, length: 50.3, diameter: 9 };

/** Frontal area of a 9 m cylinder, m². */
export const AREA = Math.PI * (BOOSTER.diameter / 2) ** 2;

/**
 * How easily each shape slips through the air (drag coefficient): a pointed
 * stack flying nose first slips through; a booster falling engines first is
 * blunt and slows hard — which is how a real one sheds most of its speed
 * before the landing burn.
 */
export const DRAG = { noseFirst: 0.3, enginesFirst: 1.0 } as const;
