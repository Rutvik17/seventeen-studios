/**
 * VEHICLES — real cars, at their published dimensions, as extruded profiles.
 *
 * ==================================================================
 * A CAR IS A PROFILE, NOT A BOX
 * ==================================================================
 *
 * Two stacked boxes — a body with a cabin on top — give you a doorstop. It has
 * no bonnet, no raked windscreen, no boot, and the wheels have to be stuck on
 * the outside because there is nowhere for them to go.
 *
 * So a vehicle here is a **side profile swept across its width**. The profile
 * is the outline you would draw if asked to draw a car: up the back, along the
 * boot, up the C-pillar, across the roof, down the windscreen, along the
 * bonnet, down to the front bumper. Sweeping it gives every one of those
 * surfaces for free, in three dimensions, correct from any angle — including
 * from behind, which two boxes never are.
 *
 * The wheels sit in **arches cut into the profile**, so a wheel is inside the
 * car rather than bolted to it. A wheel laid over an unbroken sill is the
 * commonest tell in a drawn vehicle: the tyre appears to be in the cabin.
 *
 * ==================================================================
 * OUTWARD NORMALS ARE CONSTRUCTED, NOT DISCOVERED
 * ==================================================================
 *
 * Every face knows which way it faces because it is built knowing. For the two
 * flanks that is the sweep direction; for the shell it falls out of the profile
 * edge — an edge running `(da, dh)` in the along-height plane has outward normal
 * `(−dh, da)`, because the profile is listed anticlockwise around the solid.
 *
 * That matters because the alternative — inferring the facing from the winding
 * of the projected polygon — has already put the camera inside a taxi once. It
 * depends on every face being listed in a consistent rotational order, it
 * inverts under a mirror, and it has no answer at all for a face seen exactly
 * edge-on.
 */

export type VehicleKind = 'cab' | 'sedan' | 'suv' | 'van' | 'bus';

export type VehicleSpec = {
  /** Bumper to bumper, metres. */
  length: number;
  /** Across, metres. */
  width: number;
  /** Roof, metres. */
  height: number;
  /** Rear bumper to rear axle. */
  rearOverhang: number;
  wheelbase: number;
  /** Tyre radius. */
  wheelR: number;
  /** Underside of the body. */
  sill: number;
  /**
   * The side outline, rear to front, as [along, height] in metres.
   *
   * Listed over the top of the car. The underside is implied — it is the sill,
   * and the wheel arches are cut into it.
   */
  profile: [number, number][];
  /** Glass, as closed polygons in the same frame. */
  glass: [number, number][][];
};

/**
 * Four vehicles and a bus, at their real sizes.
 *
 * The cab is a Toyota Sienna, which is most of what the New York fleet has been
 * since the Crown Victoria went out of service — and it is why a modern New York
 * taxi is a tall van shape rather than the low sedan everyone pictures.
 */
export const VEHICLES: Record<VehicleKind, VehicleSpec> = {
  sedan: {
    length: 4.7,
    width: 1.82,
    height: 1.44,
    rearOverhang: 1.05,
    wheelbase: 2.7,
    wheelR: 0.32,
    sill: 0.34,
    profile: [
      [0.0, 0.5],
      [0.0, 0.92],
      [0.95, 1.02],
      [1.62, 1.42],
      [2.98, 1.44],
      [3.82, 1.0],
      [4.5, 0.93],
      [4.7, 0.66],
      [4.7, 0.5],
    ],
    glass: [
      [
        [1.78, 1.35],
        [2.9, 1.37],
        [2.86, 1.06],
        [1.95, 1.05],
      ],
      [
        [2.98, 1.37],
        [3.72, 1.03],
        [2.96, 1.05],
      ],
    ],
  },

  cab: {
    length: 5.17,
    width: 1.99,
    height: 1.78,
    rearOverhang: 1.12,
    wheelbase: 3.03,
    wheelR: 0.34,
    sill: 0.36,
    profile: [
      [0.0, 0.54],
      [0.0, 1.62],
      [0.42, 1.76],
      [3.35, 1.78],
      [4.05, 1.24],
      [4.92, 1.06],
      [5.17, 0.74],
      [5.17, 0.54],
    ],
    glass: [
      [
        [0.36, 1.66],
        [1.28, 1.68],
        [1.26, 1.14],
        [0.34, 1.12],
      ],
      [
        [1.42, 1.68],
        [2.42, 1.69],
        [2.4, 1.15],
        [1.4, 1.14],
      ],
      [
        [2.56, 1.69],
        [3.3, 1.7],
        [3.86, 1.25],
        [2.54, 1.16],
      ],
    ],
  },

  suv: {
    length: 4.85,
    width: 1.93,
    height: 1.72,
    rearOverhang: 1.02,
    wheelbase: 2.86,
    wheelR: 0.36,
    sill: 0.42,
    profile: [
      [0.0, 0.6],
      [0.0, 1.6],
      [0.3, 1.72],
      [3.2, 1.72],
      [3.86, 1.24],
      [4.62, 1.08],
      [4.85, 0.78],
      [4.85, 0.6],
    ],
    glass: [
      [
        [0.3, 1.62],
        [1.5, 1.63],
        [1.48, 1.16],
        [0.28, 1.14],
      ],
      [
        [1.64, 1.63],
        [2.66, 1.64],
        [2.64, 1.17],
        [1.62, 1.16],
      ],
      [
        [2.8, 1.64],
        [3.16, 1.64],
        [3.7, 1.25],
        [2.78, 1.18],
      ],
    ],
  },

  van: {
    length: 5.9,
    width: 2.03,
    height: 2.55,
    rearOverhang: 1.14,
    wheelbase: 3.43,
    wheelR: 0.37,
    sill: 0.46,
    profile: [
      [0.0, 0.62],
      [0.0, 2.55],
      [4.2, 2.55],
      [4.42, 1.42],
      [5.6, 1.16],
      [5.9, 0.82],
      [5.9, 0.62],
    ],
    glass: [
      [
        [4.3, 1.98],
        [4.4, 1.5],
        [5.5, 1.24],
        [5.42, 1.9],
      ],
      [
        [3.2, 2.4],
        [4.1, 2.4],
        [4.16, 1.9],
        [3.2, 1.9],
      ],
    ],
  },

  // An MTA 40-footer. Flat sides, flat front, and a roof that goes all the way.
  bus: {
    length: 12.2,
    width: 2.6,
    height: 3.2,
    rearOverhang: 2.6,
    wheelbase: 7.9,
    wheelR: 0.51,
    sill: 0.42,
    profile: [
      [0.0, 0.55],
      [0.0, 3.1],
      [0.4, 3.2],
      [11.6, 3.2],
      [12.2, 3.0],
      [12.2, 0.55],
    ],
    glass: [
      [
        [0.5, 2.9],
        [3.4, 2.9],
        [3.4, 1.6],
        [0.5, 1.6],
      ],
      [
        [3.8, 2.9],
        [6.7, 2.9],
        [6.7, 1.6],
        [3.8, 1.6],
      ],
      [
        [7.1, 2.9],
        [10.0, 2.9],
        [10.0, 1.6],
        [7.1, 1.6],
      ],
      [
        [10.6, 2.95],
        [12.0, 2.9],
        [12.0, 1.5],
        [10.6, 1.5],
      ],
    ],
  },
};

/** Axle positions along the vehicle, from the rear bumper. */
export function axles(spec: VehicleSpec): [number, number] {
  return [spec.rearOverhang, spec.rearOverhang + spec.wheelbase];
}

/**
 * The closed side outline, with the wheel arches cut into the underside.
 *
 * Returned as [along, height] pairs going anticlockwise around the solid, so
 * the outward normal of the edge from point i to i+1 is `(−dh, da)` — which is
 * what the renderer uses to decide which faces it can see, without ever having
 * to reason about winding.
 */
export function outline(spec: VehicleSpec): [number, number][] {
  const [rear, front] = axles(spec);
  const arch = spec.wheelR + 0.06;
  const pts: [number, number][] = [...spec.profile];

  // Back along the underside, arching over each wheel. Front axle first,
  // because this run travels from the front of the car toward the rear.
  const dip = (centre: number) => {
    pts.push([centre + arch, spec.sill]);
    // Five points make an arch that reads as a curve at any size a car is
    // ever drawn at, and a semicircle drawn with more is wasted.
    for (let i = 1; i < 5; i += 1) {
      const a = Math.PI * (i / 5);
      pts.push([centre + Math.cos(a) * arch, spec.sill + Math.sin(a) * arch * 0.92]);
    }
    pts.push([centre - arch, spec.sill]);
  };

  pts.push([spec.length, spec.sill]);
  dip(front);
  dip(rear);
  pts.push([0, spec.sill]);

  return pts;
}
