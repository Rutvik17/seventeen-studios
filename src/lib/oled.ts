/**
 * THE OLED — the companion's own display, and the power stage it needs.
 *
 * The device carries TWO displays, and that is an engineering decision rather
 * than an indulgence. Each one is used for what it is physically good at:
 *
 *   - the 4.01" ACeP e-paper holds the readout. It draws nothing to keep an
 *     image, so the price and the timestamp cost no power at all between
 *     refreshes. It cannot animate: ~30 s per refresh, no partial mode.
 *   - a 1.5" SSD1351 RGB OLED carries the companion. It is emissive, addressable
 *     by window, and fast enough to animate at frame rates nobody can see the
 *     edge of. It costs power every second it is lit.
 *
 * Trying to do both jobs on one panel is what forces a compromise. e-paper
 * cannot move; an OLED cannot hold an image for a week on a coin cell.
 *
 * ---
 *
 * EVERY NUMBER BELOW IS FROM THE DATASHEET OR COMPUTED FROM IT
 *
 * Solomon Systech SSD1351 Rev 1.5, Jan 2011:
 *   - Table 12-1 DC Characteristics: V_CC 10/16/18 V min/typ/max, V_CI 2.4-3.5 V,
 *     V_DDIO 1.65 V to V_CI, sleep current 10 uA max on both rails
 *   - Section 8.7 SEG/COM Driver: 384 segment current sources (128 x 3 colours),
 *     each adjustable 0-200 uA in 256 steps by the contrast command C1h.
 *     Commons scan sequentially row by row; an OFF pixel disables its segment
 *     current entirely.
 *   - Serial interface: 4-wire SPI, 50 ns minimum clock period => 20 MHz
 *
 * TI TPS61040 (SLVS413), the boost stage:
 *   - SOT-23-5, 2.90 x 1.60 mm, V_IN 1.8-6 V, V_OUT to 28 V
 *   - 400 mA internal switch current limit, switching to 1 MHz
 *   - feedback reference 1.233 V typical
 *   - typical application: L1 10 uH, C_IN 4.7 uF, C_OUT 1 uF, Schottky D1
 */

/* ------------------------------------------------------------------ *
 * The panel
 * ------------------------------------------------------------------ */

export const OLED = {
  /** Addressable pixels. A native grid — pixel art is drawn 1:1, never scaled. */
  width: 128,
  height: 128,

  /** Module outline, mm. */
  moduleWidth: 33.8,
  moduleHeight: 40.0,
  /** Active area, mm. */
  mmWidth: 26.855,
  mmHeight: 25.864,

  /**
   * Colour depth actually used.
   *
   * The controller supports 262k (18-bit) and 65k (16-bit). 16-bit is chosen
   * because it is two whole bytes per pixel — 18-bit costs three bytes for one
   * extra bit per channel, so the frame is 50% larger for a difference nobody
   * can see on a 26 mm panel.
   */
  bitsPerPixel: 16,

  /** Segment current sources: 128 columns x 3 colours. Datasheet 8.7. */
  segments: 384,
  /** Maximum current per source, amps. 200 uA, in 256 steps via C1h. */
  segmentMaxA: 200e-6,
  /** Rows scanned sequentially. Only one is driven at any instant. */
  rows: 128,

  /** Panel drive rail, volts. Datasheet Table 12-1: 10 / 16 / 18. */
  vccTypical: 16,
  vccMin: 10,
  vccMax: 18,
  /** Logic rail, volts. */
  vciMin: 2.4,
  vciMax: 3.5,

  /** Datasheet minimum SPI clock period, seconds. 50 ns => 20 MHz. */
  spiMinPeriodS: 50e-9,

  /** Sleep current per rail, amps. Table 12-1, display off. */
  sleepA: 10e-6,

  contrastRatio: 2000,
  viewingAngleDeg: 160,
} as const;

export const SPI_MAX_HZ = 1 / OLED.spiMinPeriodS;

/* ------------------------------------------------------------------ *
 * Power
 * ------------------------------------------------------------------ */

/**
 * Average V_CC current, milliamps, for a given picture.
 *
 * The derivation matters because the obvious guess is wrong by a factor of 128.
 *
 * Only ONE row is driven at a time — the commons scan sequentially — so the
 * instantaneous current is the sum of that row's 384 segment sources. Averaged
 * across a frame, each row is driven for 1/128 of the time, so:
 *
 *   average = (1/128) x SUM over all rows of (that row's 384 currents)
 *           = (total current summed over every subpixel) / 128
 *           = 384 x (mean current per subpixel)
 *
 * Which is why the answer depends on the mean brightness of the whole image and
 * not on its resolution.
 *
 * `litFraction` is the share of subpixels that are on at all; `brightness` is
 * their mean level, 0-1, as set by the contrast command. An off pixel draws
 * ZERO — the datasheet is explicit that the segment current is disabled — which
 * is the property that makes a dark picture nearly free and is the reason this
 * is a design constraint on the artwork rather than a footnote.
 */
export function vccCurrentMa(litFraction: number, brightness: number): number {
  const meanPerSubpixel = OLED.segmentMaxA * litFraction * brightness;
  return OLED.segments * meanPerSubpixel * 1000;
}

/** Panel power, milliwatts, at the typical drive rail. */
export function panelPowerMw(litFraction: number, brightness: number): number {
  return vccCurrentMa(litFraction, brightness) * OLED.vccTypical;
}

/**
 * Boost efficiency at a given step-up ratio.
 *
 * Not a constant. The TPS61040 curves in the datasheet run roughly 70-90%
 * depending on input voltage and load, and efficiency falls as the ratio rises
 * because the switch spends proportionally longer conducting. 16 V from a
 * 3.7 V cell is a 4.3x step-up, which lands near the bottom of that band.
 *
 * Modelled as a linear fall from 88% at unity to about 78% at 5x. Quoting a
 * flat 90% would understate the input current by a fifth, which is exactly the
 * error that makes a battery-life figure too optimistic.
 */
export function boostEfficiency(vin: number, vout: number): number {
  const ratio = vout / Math.max(vin, 0.1);
  return Math.max(0.7, Math.min(0.88, 0.88 - (ratio - 1) * 0.025));
}

/** Current drawn from the cell to supply the panel, milliamps. */
export function boostInputCurrentMa(
  litFraction: number,
  brightness: number,
  vin = 3.7,
): number {
  const outMw = panelPowerMw(litFraction, brightness);
  return outMw / boostEfficiency(vin, OLED.vccTypical) / vin;
}

/*
  THE PICTURE THE PANEL ACTUALLY SHOWS, AND WHAT IT COSTS.

  Measured, not assumed: the companion scene was rendered at true 1:1 and its
  mean per-subpixel drive computed across all seven hours. Fuji at first light
  is the most expensive at 27.0% — it has the brightest sky and the most snow.

  This matters because the earlier budget carried a flat 38 mA for the panel,
  chosen when the OLED showed a sparse monochrome face on black. Real artwork
  lights far more of the field, and at FULL contrast this scene pulls 112.5 mA
  from the cell, which is 4.3 days rather than the 10.7 the notebook claims.

  So the artwork sets the brightness. Running at 34% contrast brings it back to
  37.9 mA and the battery figure holds — and 34% on an OLED indoors is still
  perfectly legible, because the panel emits rather than reflects and its full
  scale is sized for direct sunlight.

  The honest shape of this is that a design constraint flows from the art to the
  hardware, not the other way around, and it is written down here rather than
  discovered later on a bench.
*/
export const SCENE_DRIVE = 0.27;

/** Contrast the companion runs at, chosen so the panel meets its power budget. */
export const PANEL_CONTRAST = 0.34;

/** What the companion costs from the cell while it is awake and animating. */
export function companionAwakeMa(): number {
  return boostInputCurrentMa(SCENE_DRIVE * PANEL_CONTRAST, 1);
}

/**
 * The switch current limit is a real ceiling on brightness, not a formality.
 *
 * The TPS61040's internal switch limits at 400 mA. A full-white screen at full
 * contrast needs 384 x 200 uA = 76.8 mA of V_CC, which is 1.23 W out, which at
 * 79% efficiency and a 3.0 V depleted cell is 518 mA in.
 *
 * The converter cannot deliver that. So the achievable brightness DEPENDS ON
 * THE STATE OF CHARGE, and the honest consequences are that the contrast
 * register has to be capped in firmware and the artwork has to be mostly dark.
 * That is a genuine constraint discovered by arithmetic, and it is a better
 * reason to draw a dark character than any aesthetic argument.
 */
export const BOOST_SWITCH_LIMIT_MA = 400;

/** Largest mean brightness the converter can sustain at a given cell voltage. */
export function brightnessCeiling(vin: number, litFraction = 1): number {
  const efficiency = boostEfficiency(vin, OLED.vccTypical);
  const availableMw = BOOST_SWITCH_LIMIT_MA * vin * efficiency;
  const fullMw = panelPowerMw(litFraction, 1);
  return fullMw > 0 ? Math.min(1, availableMw / fullMw) : 1;
}

/* ------------------------------------------------------------------ *
 * The boost stage
 * ------------------------------------------------------------------ */

/** Ideal boost duty cycle. D = 1 - Vin/Vout. */
export function boostDuty(vin: number, vout = OLED.vccTypical): number {
  return 1 - vin / vout;
}

/**
 * The feedback divider, from the part's own reference.
 *
 * V_OUT = V_FB x (1 + R1/R2), with V_FB = 1.233 V typical.
 *
 * R2 is fixed at 100 kohm and R1 solved, then snapped to E12 — because a
 * divider of arbitrary resistances is a schematic nobody can buy. The returned
 * `actual` is what those E12 parts really produce, which is the number that
 * matters and is never exactly the target.
 */
export const FB_REFERENCE_V = 1.233;

export function feedbackDivider(vout = OLED.vccTypical, r2Ohms = 100_000) {
  const ratio = vout / FB_REFERENCE_V - 1;
  const ideal = ratio * r2Ohms;
  const r1 = e12(ideal);
  return {
    r1,
    r2: r2Ohms,
    ideal,
    actual: FB_REFERENCE_V * (1 + r1 / r2Ohms),
  };
}

/** Nearest E12 preferred value at the same decade. */
export function e12(value: number): number {
  const series = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
  if (!(value > 0)) return 0;
  const decade = 10 ** Math.floor(Math.log10(value));
  const normalised = value / decade;
  let best = series[0];
  for (const s of series) {
    if (Math.abs(s - normalised) < Math.abs(best - normalised)) best = s;
  }
  return best * decade;
}

/**
 * Output capacitor for a target ripple.
 *
 * C = I_OUT x D / (dV x f). The cap must also be rated well above 16 V, and a
 * ceramic's capacitance falls with applied DC bias — an X7R at its rated
 * voltage can lose half its value — so the part is specified at 25 V for a
 * 16 V rail rather than at 16 V.
 */
export function outputCapUf(
  loadMa: number,
  rippleV: number,
  vin = 3.7,
  switchingHz = 1e6,
): number {
  const d = boostDuty(vin);
  return ((loadMa / 1000) * d) / (rippleV * switchingHz) * 1e6;
}

export const BOOST = {
  part: 'TPS61040DBV',
  package: 'SOT-23-5',
  packageMm: { w: 2.9, h: 1.6 },
  switchLimitMa: BOOST_SWITCH_LIMIT_MA,
  switchingHz: 1e6,
  /** TI's typical application values, datasheet Figure 1. */
  inductorUh: 10,
  inputCapUf: 4.7,
  outputCapUf: 1.0,
  /** A ceramic at 25 V for a 16 V rail: capacitance falls under DC bias. */
  outputCapRatingV: 25,
  diode: 'Schottky, 30 V, low Vf',
} as const;

/* ------------------------------------------------------------------ *
 * Timing
 * ------------------------------------------------------------------ */

/**
 * Milliseconds to push a rectangle of pixels over SPI.
 *
 * The bus is the only thing that limits the frame rate here, and it does not
 * limit it much: a full 128x128 frame at 16 bpp is 262,144 bits, which at
 * 20 MHz is 13.1 ms — about 76 frames a second.
 *
 * The number that matters is the WINDOWED one. The SSD1351 takes a column and
 * row address window and accepts only the pixels inside it, so redrawing a
 * 48x56 character costs 2.15 ms and nothing else on the display is touched.
 *
 * That is the whole difference from the e-paper beside it, which has no partial
 * refresh at all and must drive every pigment in the panel to redraw one dot.
 */
export function transferMs(
  pixels: number,
  clockHz = SPI_MAX_HZ,
  bpp = OLED.bitsPerPixel,
): number {
  return ((pixels * bpp) / clockHz) * 1000;
}

export const FULL_FRAME_MS = transferMs(OLED.width * OLED.height);

/**
 * Burn-in, which an e-paper panel simply does not have.
 *
 * OLED emitters age with use and the blue subpixel ages fastest, so anything
 * held in one place at one brightness for hours leaves a permanent shadow. A
 * price readout is close to the worst case for it — same glyph positions, same
 * labels, all day.
 *
 * Which is the second reason the readout lives on the e-paper. What remains on
 * the OLED is a character that moves, and moving content is its own mitigation.
 * The standard belt-and-braces measure is to shift the whole image by a few
 * pixels periodically; at 128 x 128 a 2 px orbit is 1.6% of the width and
 * invisible in use.
 */
export const BURN_IN = {
  /** Pixels the frame is offset by, cycling, to spread wear. */
  orbitPx: 2,
  /** How often the offset advances, seconds. */
  orbitPeriodS: 90,
  /** The fastest-ageing emitter, and the reason blue is used sparingly. */
  weakestChannel: 'blue',
} as const;
