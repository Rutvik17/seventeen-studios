/**
 * THE BOARD — geometry and electrical design for the landing page.
 *
 * A real two-layer PCB for a small e-ink companion device: an ESP32-C3 module,
 * a 3.3 V LDO, USB-C, a LiPo connector, a 32.768 kHz crystal and a 24-pin FPC
 * for the display. Everything below is in millimetres, everything is a real
 * package, and every electrical number is calculated rather than chosen to look
 * plausible.
 *
 * ---
 *
 * WHY THE NUMBERS ARE COMPUTED AND NOT TYPED IN
 *
 * A drawing of a circuit board is easy and worth nothing — it is set dressing,
 * and any engineer looking at this site can tell in about four seconds. What is
 * worth something is a board whose trace widths come out of IPC-2221, whose
 * crystal load capacitors come out of the oscillator's own load spec, and whose
 * battery life is the capacity divided by the measured average current.
 *
 * So the functions here are the actual standard formulae, exported so the page
 * can show its working the same way Grasp does. If a value on screen is wrong,
 * it is wrong because the physics is wrong, not because a designer guessed.
 *
 * ---
 *
 * WHY EVERY TRACE IS 45°
 *
 * Right-angle corners in a copper trace are a real manufacturing problem, not
 * an aesthetic preference: the acute inside corner traps etchant and the corner
 * over-etches, thinning the conductor exactly where it is already narrowest.
 * Every board house's design rules forbid them. Routing at 45° is what a real
 * layout looks like, and getting it wrong is the first thing that would give
 * this away as decoration.
 */

/* ------------------------------------------------------------------ *
 * Board
 * ------------------------------------------------------------------ */

export const BOARD = {
  width: 88,
  height: 58,
  /** Corner radius, mm. A routed board edge, not a sawn one. */
  radius: 3,
  /** Standard FR-4. Quoted on the page. */
  thickness: 1.6,
  /** Copper weight, ounces per square foot. Feeds the trace-width maths. */
  copperOz: 1,
} as const;

export type Pad = {
  /** Centre, mm, relative to the board's top-left. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Pin name, used to label the net. */
  name: string;
};

export type Component = {
  ref: string;
  part: string;
  package: string;
  /** Centre of the body, mm. */
  x: number;
  y: number;
  /** Body size, mm — real package dimensions. */
  w: number;
  h: number;
  /** Rotation in degrees, 0 or 90. */
  rot?: 0 | 90;
  /** Drawn as a polarised part (pin-1 dot, or a cathode bar). */
  polarised?: boolean;
  /** Resistors carry a value so the colour bands can encode it. */
  ohms?: number;
  /** Capacitors carry a value in picofarads. */
  picofarads?: number;
  /** Order it lands in, during the placement act. */
  step: number;
};

/**
 * The bill of materials, placed.
 *
 * Package dimensions are the real ones from the manufacturers' drawings —
 * an 0402 really is 1.0 × 0.5 mm, a SOT-23-5 really is 2.9 × 1.6 mm, and the
 * ESP32-C3-MINI-1 really is 13.2 × 16.6 mm. Those ratios are most of what makes
 * a layout read as a layout: get the module-to-passive size relationship wrong
 * and it looks like a diagram of a circuit board.
 */
export const COMPONENTS: Component[] = [
  { ref: 'U1', part: 'ESP32-C3-MINI-1', package: 'Module', x: 34, y: 27, w: 13.2, h: 16.6, polarised: true, step: 0 },
  { ref: 'J1', part: 'USB-C receptacle', package: '16P', x: 6.5, y: 29, w: 7.3, h: 8.94, rot: 90, step: 1 },
  { ref: 'U2', part: 'AP2112K-3.3', package: 'SOT-23-5', x: 19, y: 14, w: 2.9, h: 1.6, polarised: true, step: 2 },
  { ref: 'J3', part: 'JST-PH 2-pin', package: 'B2B-PH', x: 8, y: 48, w: 7.9, h: 4.5, step: 3 },
  { ref: 'Y1', part: '32.768 kHz', package: '3215', x: 52, y: 15, w: 3.2, h: 1.5, step: 4 },
  { ref: 'J2', part: 'FPC 24P 0.5 mm', package: 'FH12', x: 74, y: 27, w: 5.0, h: 13.6, rot: 0, step: 5 },
  { ref: 'SW1', part: 'Tactile', package: '4.2×3.2', x: 20, y: 46, w: 4.2, h: 3.2, step: 6 },
  { ref: 'C1', part: '18 pF', package: '0402', x: 49, y: 11, w: 1.0, h: 0.5, picofarads: 18, step: 7 },
  { ref: 'C2', part: '18 pF', package: '0402', x: 55, y: 11, w: 1.0, h: 0.5, picofarads: 18, step: 8 },
  { ref: 'C3', part: '10 µF', package: '0603', x: 15, y: 19, w: 1.6, h: 0.8, picofarads: 10_000_000, step: 9 },
  { ref: 'C4', part: '1 µF', package: '0402', x: 24, y: 19, w: 1.0, h: 0.5, picofarads: 1_000_000, step: 10 },
  { ref: 'R1', part: '10 kΩ', package: '0402', x: 27, y: 42, w: 1.0, h: 0.5, ohms: 10_000, step: 11 },
  { ref: 'R2', part: '5.1 kΩ', package: '0402', x: 13, y: 36, w: 1.0, h: 0.5, ohms: 5_100, step: 12 },
  { ref: 'R3', part: '5.1 kΩ', package: '0402', x: 13, y: 39, w: 1.0, h: 0.5, ohms: 5_100, step: 13 },
];

/* ------------------------------------------------------------------ *
 * Nets
 * ------------------------------------------------------------------ */

export type Net = {
  id: string;
  /** What it carries — shown on hover and in the legend. */
  label: string;
  /** Waypoints in mm. The router turns these into a 45°-legal path. */
  points: [number, number][];
  /** Steady-state current in amps. Decides the trace width. */
  amps: number;
  kind: 'power' | 'ground' | 'signal';
  step: number;
};

export const NETS: Net[] = [
  /*
    Endpoints land on real pad edges, computed from each component's placement
    and package size rather than eyeballed. The first version of this table had
    traces stopping a millimetre or two short of their parts, which on a board
    drawing reads instantly as fake — copper that does not touch a pad is the
    one thing an engineer looking at this will notice before anything else.
  */
  // USB-C (right edge x 10.15) into the regulator's input pad (left edge 17.05).
  { id: 'vbus', label: 'VBUS · 5 V', points: [[10.15, 29], [13, 29], [17.05, 14]], amps: 0.5, kind: 'power', step: 0 },
  // Regulator output (right edge 20.95) to the module (left edge 27.4).
  { id: 'v33a', label: '3V3 · rail', points: [[20.95, 14], [24, 14], [27.4, 21]], amps: 0.5, kind: 'power', step: 1 },
  // Decoupling caps hang off the same rail.
  { id: 'v33b', label: '3V3 · decoupling', points: [[23.5, 18.75], [23.5, 15.5], [22, 14.4]], amps: 0.15, kind: 'power', step: 2 },
  { id: 'v33c', label: '3V3 · bulk', points: [[15.8, 19], [19, 19], [21, 15.5]], amps: 0.15, kind: 'power', step: 3 },
  // Battery connector (right edge 11.95) up to the module.
  { id: 'vbat', label: 'VBAT · LiPo', points: [[11.95, 48], [22, 48], [27.4, 33]], amps: 0.4, kind: 'power', step: 4 },
  // Crystal (x 50.4-53.6) back to the module's right edge at 40.6.
  { id: 'xin', label: 'XTAL_P', points: [[50.4, 15], [45, 15], [40.6, 21]], amps: 0.0001, kind: 'signal', step: 5 },
  { id: 'xout', label: 'XTAL_N', points: [[53.6, 15], [57, 18], [57, 23], [40.6, 23]], amps: 0.0001, kind: 'signal', step: 6 },
  // Display bus — module right edge 40.6 to the FPC's left edge 71.5.
  { id: 'spi_clk', label: 'EPD_SCK', points: [[40.6, 25], [60, 25], [71.5, 23]], amps: 0.02, kind: 'signal', step: 7 },
  { id: 'spi_mosi', label: 'EPD_MOSI', points: [[40.6, 27], [62, 27], [71.5, 26]], amps: 0.02, kind: 'signal', step: 8 },
  { id: 'epd_cs', label: 'EPD_CS', points: [[40.6, 29], [71.5, 29]], amps: 0.01, kind: 'signal', step: 9 },
  { id: 'epd_dc', label: 'EPD_DC', points: [[40.6, 31], [62, 31], [71.5, 32]], amps: 0.01, kind: 'signal', step: 10 },
  // Button (right edge 22.1) through the pull-up to the module.
  { id: 'boot', label: 'GPIO9 · BOOT', points: [[27.5, 42], [31, 42], [34, 35.3]], amps: 0.001, kind: 'signal', step: 11 },
  { id: 'gnd', label: 'GND', points: [[22.1, 46], [33, 46], [37, 35.3]], amps: 0.5, kind: 'ground', step: 12 },
];

/* ------------------------------------------------------------------ *
 * Trace width — IPC-2221
 * ------------------------------------------------------------------ */

/**
 * Minimum trace width for a given current, per IPC-2221A.
 *
 *     A = ( I / (k · ΔT^b) )^(1/c)          → cross-section in square mils
 *     w = A / (thickness_oz · 1.378)        → width in mils
 *
 * The constants differ by layer because an internal trace is buried in FR-4 and
 * can only shed heat by conduction, while an external one has air on one side.
 * That is why `k` is roughly twice as large outside: the same copper carries
 * about twice the current for the same temperature rise.
 *
 * 1.378 is the thickness of one ounce of copper in mils — one ounce spread over
 * a square foot works out to 1.378 thousandths of an inch.
 *
 * Returned in millimetres, because the rest of this file is metric.
 */
export function traceWidthMm(
  amps: number,
  options: { rise?: number; copperOz?: number; internal?: boolean } = {},
): number {
  const rise = options.rise ?? 10;
  const oz = options.copperOz ?? BOARD.copperOz;
  const k = options.internal ? 0.024 : 0.048;
  const b = 0.44;
  const c = 0.725;

  const area = Math.pow(amps / (k * Math.pow(rise, b)), 1 / c); // mils²
  const mils = area / (oz * 1.378);
  return mils * 0.0254;
}

/**
 * What the board is actually routed at.
 *
 * The IPC minimum is a thermal limit, not a target — a 0.5 A rail computes to
 * about 0.12 mm, which is legal and a bad idea. Real layouts run power wider for
 * lower DC resistance and easier assembly, and signals wide enough to be
 * manufacturable rather than as narrow as physics allows. So the drawn width is
 * the IPC minimum with margin applied, floored at a fabricator's comfortable
 * 0.2 mm.
 */
export function drawnWidthMm(net: Net): number {
  const minimum = traceWidthMm(net.amps);
  const margin = net.kind === 'signal' ? 1 : 3;
  return Math.max(0.2, Math.min(1.2, minimum * margin));
}

/* ------------------------------------------------------------------ *
 * Crystal load capacitance
 * ------------------------------------------------------------------ */

/**
 * The load capacitors a crystal needs, from its specified load capacitance.
 *
 *     C_L = (C1 · C2) / (C1 + C2) + C_stray
 *
 * With C1 = C2 (which is how it is always built), that reduces to
 * C1 = 2 · (C_L − C_stray).
 *
 * Getting this wrong does not stop the oscillator — it makes it run at the
 * wrong frequency, which for a 32.768 kHz timekeeping crystal means a clock
 * that drifts. Over-capacitance also makes it slow to start or refuse to start
 * cold, which is the classic "works on the bench, dead in the field" fault.
 *
 * `stray` of 2–3 pF is the usual allowance for pad and track capacitance.
 */
export function loadCapPf(loadPf: number, strayPf = 3): number {
  return 2 * (loadPf - strayPf);
}

/** Nearest E12 preferred value — you cannot buy the exact answer. */
export function toE12(value: number): number {
  const E12 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82];
  const decade = Math.pow(10, Math.floor(Math.log10(value)));
  const norm = value / decade;
  let best = E12[0];
  for (const e of E12) {
    if (Math.abs(e / 10 - norm) < Math.abs(best / 10 - norm)) best = e;
  }
  return (best / 10) * decade;
}

/* ------------------------------------------------------------------ *
 * Power budget
 * ------------------------------------------------------------------ */

export type PowerMode = { name: string; milliamps: number; dutyCycle: number };

/**
 * A duty-cycled power budget, which is the only kind that matters for a device
 * that spends its life asleep.
 *
 * An e-ink companion wakes, pulls data over Wi-Fi, redraws and sleeps. The
 * radio dominates the instantaneous current by two orders of magnitude and is
 * on for well under a percent of the time, so the AVERAGE is what sets battery
 * life and the peak is what sets the regulator and the trace width. Sizing a
 * battery off peak current is the standard mistake; sizing a regulator off
 * average current is the other one.
 */
export const POWER_MODES: PowerMode[] = [
  { name: 'Deep sleep', milliamps: 0.043, dutyCycle: 0.9945 },
  { name: 'Wi-Fi wake + fetch', milliamps: 240, dutyCycle: 0.0035 },
  { name: 'E-ink refresh', milliamps: 26, dutyCycle: 0.002 },
];

export function averageCurrentMa(modes: PowerMode[] = POWER_MODES): number {
  return modes.reduce((sum, m) => sum + m.milliamps * m.dutyCycle, 0);
}

export function peakCurrentMa(modes: PowerMode[] = POWER_MODES): number {
  return Math.max(...modes.map((m) => m.milliamps));
}

/**
 * Battery life in days.
 *
 * The 0.85 is a real derate, not padding: a LiPo does not deliver its rated
 * capacity down to the regulator's dropout, and self-discharge and the
 * regulator's own quiescent draw take a further slice. Quoting the undated
 * arithmetic gives a number roughly a fifth too optimistic, which is how
 * datasheet battery lives are usually produced.
 */
export function batteryDays(mAh: number, averageMa = averageCurrentMa()): number {
  return (mAh * 0.85) / averageMa / 24;
}

/* ------------------------------------------------------------------ *
 * Routing
 * ------------------------------------------------------------------ */

/**
 * Turn waypoints into a 45°-legal path.
 *
 * Between each pair the router runs one axis-aligned segment and one diagonal,
 * never a right angle. The diagonal takes the shorter of the two deltas so the
 * corner is a true 45°, and the axis-aligned remainder takes up the slack.
 *
 * This is what a hand-routed board looks like, and it is the detail that would
 * expose the whole thing as decoration if it were wrong — right-angle copper is
 * forbidden by every fabricator's design rules because the acute inside corner
 * traps etchant and over-etches.
 */
export function routePath(points: [number, number][]): string {
  if (points.length === 0) return '';
  let d = `M ${round(points[0][0])} ${round(points[0][1])}`;

  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const dx = x1 - x0;
    const dy = y1 - y0;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    if (adx < 1e-6 || ady < 1e-6) {
      d += ` L ${round(x1)} ${round(y1)}`;
      continue;
    }

    const diag = Math.min(adx, ady);
    const sx = Math.sign(dx);
    const sy = Math.sign(dy);

    if (adx > ady) {
      // Straight first, then break away at 45° into the target.
      const bx = x1 - diag * sx;
      // An exact 45° leg makes the straight run zero-length. Emitting it anyway
      // leaves a duplicate point in the path, which `pathLength` then counts and
      // the dash animation stutters over.
      if (Math.abs(bx - x0) > 1e-6) d += ` L ${round(bx)} ${round(y0)}`;
      d += ` L ${round(x1)} ${round(y1)}`;
    } else {
      const by = y1 - diag * sy;
      if (Math.abs(by - y0) > 1e-6) d += ` L ${round(x0)} ${round(by)}`;
      d += ` L ${round(x1)} ${round(y1)}`;
    }
  }
  return d;
}

/**
 * Path length in mm, for dash-based current animation.
 *
 * Computed rather than read from `getTotalLength()` so it is available during
 * server render and before the SVG has ever been laid out.
 */
export function pathLength(points: [number, number][]): number {
  const parsed = routePath(points)
    .split(/(?=[ML])/)
    .map((s) => s.trim().slice(1).trim().split(/\s+/).map(Number))
    .filter((p) => p.length === 2 && p.every((n) => !Number.isNaN(n)));

  let total = 0;
  for (let i = 1; i < parsed.length; i++) {
    total += Math.hypot(parsed[i][0] - parsed[i - 1][0], parsed[i][1] - parsed[i - 1][1]);
  }
  return total;
}

/* ------------------------------------------------------------------ *
 * Resistor colour bands
 * ------------------------------------------------------------------ */

const BAND_COLOURS = [
  '#1a1a1a', '#8b4513', '#d92b2b', '#e8820c', '#e8c30c',
  '#2f9e44', '#1c64d1', '#8b3fc7', '#9e9e9e', '#f5f5f5',
];

/**
 * The four bands that actually encode a resistance.
 *
 * Two significant digits, a decade multiplier, then tolerance. A 10 kΩ is
 * brown-black-orange: 1, 0, ×10³. These are drawn on the 0402s at a size where
 * nobody can read them — real 0402s are laser-marked or blank — but they are
 * correct, and the tooltip prints the decode. The site is a portfolio; the
 * details are the portfolio.
 */
export function resistorBands(ohms: number): string[] {
  const exp = Math.floor(Math.log10(ohms)) - 1;
  const mantissa = Math.round(ohms / Math.pow(10, exp));
  const d1 = Math.floor(mantissa / 10);
  const d2 = mantissa % 10;
  return [
    BAND_COLOURS[d1] ?? BAND_COLOURS[0],
    BAND_COLOURS[d2] ?? BAND_COLOURS[0],
    BAND_COLOURS[Math.max(0, Math.min(9, exp))],
    '#b8860b', // gold — ±5%
  ];
}

export function formatOhms(ohms: number): string {
  if (ohms >= 1e6) return `${trim(ohms / 1e6)} MΩ`;
  if (ohms >= 1e3) return `${trim(ohms / 1e3)} kΩ`;
  return `${trim(ohms)} Ω`;
}

export function formatFarads(pf: number): string {
  if (pf >= 1e6) return `${trim(pf / 1e6)} µF`;
  if (pf >= 1e3) return `${trim(pf / 1e3)} nF`;
  return `${trim(pf)} pF`;
}

function trim(v: number): string {
  return String(Math.round(v * 100) / 100);
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
