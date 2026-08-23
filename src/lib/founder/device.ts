/**
 * MODEL A — the device, as numbers.
 *
 * The landing page DRAWS a companion board; this page builds the real one. Both
 * describe the same object, so both have to agree about it, and the only way to
 * make that true is for every figure to come from a formula rather than from a
 * paragraph. Nothing in this file is typed in as a result: the constants are
 * measurements of real parts, and everything else is computed from them and
 * checked in `scripts/verify-claims.mjs`.
 *
 * ---
 *
 * WHERE THE CONSTANTS COME FROM
 *
 * Not from a datasheet PDF that nobody can check — from the GLB itself. The
 * model carries glTF `extras` on its own nodes:
 *
 *   PCB_RaspberryPi4_ModelB_85x56mm  Dimensions_mm  "85 x 56 x 1.6"
 *   EInk_2_9in_Display_Assembly      moduleOutline_mm "79.0 x 36.7"
 *                                    activeArea_mm    "66.9 x 29.05"
 *   EInk_SPI_Cable_Assembly          signals          "3V3, GND, SCLK, MOSI"
 *
 * They are repeated here because a running page cannot block on a 2 MB download
 * to lay out a paragraph — but `measureDevice()` in `model.ts` reads the mesh
 * vertices once the model has loaded and compares what was measured against what
 * is declared below. If the asset is ever re-exported at a different scale, the
 * readout says so on screen instead of quietly lying.
 *
 * ---
 *
 * WHY THIS PANEL IS NOT THE LANDING PAGE'S PANEL
 *
 * `lib/pixel.ts` describes a 4.01" seven-colour ACeP, and explains at length
 * that such a part CANNOT show a live clock: a full refresh takes about thirty
 * seconds, it flashes through the whole palette while it works, and there is no
 * partial-refresh mode at all.
 *
 * This model is a different part, and the model says so itself: it carries
 * exactly two e-ink materials, `EInk_Black` and `EInk_Paper_Surface`. Two
 * pigments, not seven. A two-colour panel has partial refresh, updates a small
 * region in a fraction of a second — and can therefore run a clock.
 *
 * So the two pages disagree about the hardware on purpose and both are right.
 * The landing page's device shows the capture time because its panel cannot do
 * better; this one shows the actual time because its panel can. What it gives up
 * is colour: there is no red and no green here, so a rise and a fall cannot be
 * coloured and the mood has to be carried entirely by the face. That is a real
 * constraint of a real part, and the readout states it rather than hiding it.
 */

/* ------------------------------------------------------------------ *
 * The board
 * ------------------------------------------------------------------ */

export const BOARD = {
  model: 'Raspberry Pi 4 Model B',
  /** Millimetres, from the PCB node's own `Dimensions_mm` extra. */
  width: 85,
  height: 56,
  thickness: 1.6,
  /** Two rows of twenty, on the 0.1" grid every hat in the world assumes. */
  gpioPins: 40,
  gpioPitch: 2.54,
  mountingHoles: 4,
} as const;

/**
 * The span from the first GPIO pin's centre to the fortieth's.
 *
 * Twenty pins per row means NINETEEN gaps, not twenty — the classic fencepost,
 * and worth computing rather than typing because it is also the number
 * `measureDevice()` checks the asset against. If the model's pins are on a real
 * 0.1" grid this is what measuring them has to produce.
 */
export const GPIO_SPAN_MM = (BOARD.gpioPins / 2 - 1) * BOARD.gpioPitch;

/* ------------------------------------------------------------------ *
 * The silicon
 * ------------------------------------------------------------------ */

export const MEMORY = {
  type: 'LPDDR4-3200',
  /** Megatransfers per second. */
  transfersPerSecond: 3200e6,
  /** Bus width, in bits. */
  busBits: 32,
} as const;

/**
 * Peak memory bandwidth, in gigabytes per second.
 *
 *   transfers/s x bus width in bits / 8 bits per byte
 *
 * "3200" in LPDDR4-3200 is the transfer rate, not the clock: the bus is double
 * data rate, so it clocks at 1600 MHz and moves data on both edges. Quoting the
 * clock instead of the transfer rate is the single most common way this figure
 * is stated at half its true value.
 */
export function memoryBandwidthGBs(): number {
  return (MEMORY.transfersPerSecond * MEMORY.busBits) / 8 / 1e9;
}

/* ------------------------------------------------------------------ *
 * The panel
 * ------------------------------------------------------------------ */

export const PANEL = {
  /** Addressable pixels. */
  width: 296,
  height: 128,
  /** Active image area in millimetres, from the display node's own extras. */
  activeWidth: 66.9,
  activeHeight: 29.05,
  /** The module including its bezel. */
  moduleWidth: 79.0,
  moduleHeight: 36.7,
  /**
   * Pigments the capsules can be driven to. Two, and that is the whole reason
   * this panel can do the things the landing page's cannot — and none of the
   * colour the landing page's can.
   */
  inks: 2,
  /** Seconds for a full display update, driving every pixel through the waveform. */
  fullRefreshSeconds: 2,
  /** Seconds for a partial update of a small region. This is the clock's budget. */
  partialRefreshSeconds: 0.3,
  hasPartialRefresh: true,
} as const;

/**
 * The framebuffer, in bytes.
 *
 * One bit per pixel, because there are two pigments and no intermediate states —
 * a capsule is white or it is black. Eight pixels therefore pack into a byte and
 * the controller is handed the plane as-is.
 *
 * A three-colour panel would need a SECOND plane of the same size for the accent
 * pigment, which doubles this. That is the other half of what colour costs here,
 * and it is why the figure is computed from `inks` rather than written down.
 */
export function framebufferBytes(): number {
  const planes = PANEL.inks - 1; // white is the absence of ink, not a plane
  return (PANEL.width * PANEL.height * planes) / 8;
}

/**
 * Milliseconds to clock the whole framebuffer out over SPI.
 *
 * The interesting thing about this number is how small it is next to
 * `fullRefreshSeconds`. Getting the image to the panel takes about ten
 * milliseconds; getting the pigment to move takes two full seconds. The wire is
 * not the bottleneck and never was — the physics of dragging titanium dioxide
 * through oil is.
 */
export function frameClockMs(clockHz = SPI.clockHz): number {
  return (framebufferBytes() * 8 * 1000) / clockHz;
}

/**
 * Pixels per inch, measured along one axis.
 *
 * Computed per-axis rather than once, because on this part they genuinely
 * differ: the pixel pitch is 0.2260 mm across and 0.2270 mm down. Quoting a
 * single "112 PPI" would be rounding a real asymmetry out of existence, and the
 * readout prints both.
 */
export function ppi(pixels: number, millimetres: number): number {
  return pixels / (millimetres / 25.4);
}

/** Pixel pitch in millimetres, along one axis. */
export function pitchMm(pixels: number, millimetres: number): number {
  return millimetres / pixels;
}

/* ------------------------------------------------------------------ *
 * The link
 * ------------------------------------------------------------------ */

export const SPI = {
  /**
   * Four conductors, named by the cable node's own `signals` extra.
   *
   * Worth being honest about: four wires is enough to CLOCK a panel, and a
   * shipped driver wants four more — CS to select the device, DC to say whether
   * a byte is a command or data, RST to reset it, and BUSY so the host can tell
   * when a refresh has finished instead of guessing. The model has four, so the
   * page says four and says what is missing.
   */
  wires: ['3V3', 'GND', 'SCLK', 'MOSI'] as const,
  /** 4 MHz — comfortably inside what these controllers accept. */
  clockHz: 4e6,
} as const;

/* ------------------------------------------------------------------ *
 * The acts
 * ------------------------------------------------------------------ */

/**
 * The five acts, and which parts of the model arrive in each.
 *
 * `assemblyOrder` is the integer the Blender export wrote onto every
 * independent root, so the ranges below are ranges over the ASSET rather than a
 * list of node names typed out here. Re-exporting the model with an extra
 * connector puts that connector in act three without this file changing.
 */
export type Act = {
  index: string;
  title: string;
  /** Inclusive range of `assemblyOrder` values that arrive during this act. */
  from: number;
  to: number;
  caption: string;
};

export const ACTS: Act[] = [
  {
    index: '01',
    title: 'Substrate',
    from: 0,
    to: 0,
    caption:
      'Fibreglass cloth in epoxy, 1.6 mm thick, with copper on both faces and green lacquer over the top. Everything else is soldered to this.',
  },
  {
    index: '02',
    title: 'Silicon',
    from: 1,
    to: 3,
    caption:
      'The processor, the memory beside it, and the regulator that feeds them both. Three parts, and most of the board’s cost.',
  },
  {
    index: '03',
    title: 'Interfaces',
    from: 4,
    to: 15,
    caption:
      'Everything the board talks to the world with — power, video, sound, network, storage, and the forty pins this project actually uses.',
  },
  {
    index: '04',
    title: 'The link',
    from: 16,
    to: 17,
    caption:
      'Four wires from the header to a controller, and the controller to the panel. This is the entire electrical distance between the computer and the picture.',
  },
  {
    index: '05',
    title: 'The panel',
    from: 18,
    to: 18,
    caption:
      'Ink, not light. The image survives the power being cut, because nothing is holding it there — the pigment has simply been moved and left.',
  },
];

/** Which act a given `assemblyOrder` belongs to. */
export function actForOrder(order: number): number {
  for (let i = ACTS.length - 1; i >= 0; i -= 1) {
    if (order >= ACTS[i].from) return i;
  }
  return 0;
}

/**
 * The last `assemblyOrder` in the model.
 *
 * Read off `ACTS` rather than counted from the loaded GLB, so the scroll
 * choreography can be laid out before the 2 MB asset has arrived.
 */
export const LAST_ORDER = ACTS[ACTS.length - 1].to;
