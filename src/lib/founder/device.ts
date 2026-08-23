/**
 * MODEL A — the device, as numbers.
 *
 * The landing page DRAWS a companion board; this page builds the real one. Both
 * describe the same object, so both have to agree about it.
 *
 * ---
 *
 * WHAT USED TO BE HERE
 *
 * A full specification: the board's dimensions, the GPIO pitch, LPDDR4
 * bandwidth, the SPI framebuffer and its clock time, the panel's PPI on both
 * axes — each computed rather than typed, each checked in
 * `scripts/verify-claims.mjs`, and each printed beside the drawing in a working
 * column.
 *
 * The working column has come out of the page while a better home is found for
 * it, and the arithmetic went with it rather than being left behind unreachable.
 * It is all in git — `git show ccb69d4 -- src/lib/founder/device.ts` — and it
 * comes back with the surface that displays it, because a formula nothing
 * prints is not a specification, it is dead weight that still has to be
 * maintained.
 *
 * What is left is what the page actually runs on: the panel the firmware draws
 * into, and the act table the choreography is derived from.
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
 * region in a fraction of a second — and can therefore run a clock, and needs
 * only ONE inversion to clear itself rather than the four the seven-colour part
 * grinds through.
 *
 * So the two pages disagree about the hardware on purpose and both are right.
 * What this one gives up is colour: there is no red and no green here, which is
 * why nothing on its panel is coloured by a rise or a fall.
 */

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
  /** Inclusive range of fitting-order values that arrive during this act. */
  from: number;
  to: number;
  /**
   * How much of the scroll this act gets, relative to the others.
   *
   * They are NOT equal, and that is the difference between a sequence that
   * reads and one that rushes. Twelve connectors need longer than one bare
   * board; and the last act has to fit the display, the cable, the panel
   * powering on, a pause long enough to read a name off it, the change to the
   * photograph, and a pause on that — so it is worth more than twice any other.
   * Equal fifths gave the whole ending about four hundred pixels of scroll and
   * everything in it happened at once.
   */
  weight: number;
};

export const ACTS: Act[] = [
  { index: '01', title: 'Substrate', from: 0, to: 0, weight: 1 },
  { index: '02', title: 'Silicon', from: 1, to: 3, weight: 1 },
  { index: '03', title: 'Interfaces', from: 4, to: 15, weight: 1.3 },
  { index: '04', title: 'The controller', from: 16, to: 16, weight: 0.9 },
  { index: '05', title: 'The panel, then the cable', from: 17, to: 18, weight: 2.4 },
];

const TOTAL_WEIGHT = ACTS.reduce((sum, act) => sum + act.weight, 0);

/** Where an act begins and how much of the scroll it owns, both 0..1. */
export function actRange(index: number): { start: number; span: number } {
  let start = 0;
  for (let i = 0; i < index; i += 1) start += ACTS[i].weight;
  return { start: start / TOTAL_WEIGHT, span: ACTS[index].weight / TOTAL_WEIGHT };
}

/** Which act a given fitting order belongs to. */
export function actForOrder(order: number): number {
  for (let i = ACTS.length - 1; i >= 0; i -= 1) {
    if (order >= ACTS[i].from) return i;
  }
  return 0;
}

/**
 * Where the export's assembly order is physically impossible.
 *
 * ==================================================================
 * A CABLE IS FITTED LAST. IT CANNOT BE FITTED TO NOTHING.
 * ==================================================================
 *
 * The Blender export numbers the last three parts:
 *
 *   16  EInk_SPI_Cable_Assembly
 *   17  EInk_SPI_Controller_PCB
 *   18  EInk_2_9in_Display_Assembly
 *
 * Followed literally, the four SPI wires are strung across empty space and then
 * the controller board and the display fly IN THROUGH THEM. Both parts pass
 * clean through four conductors on their way to the bench, which is the single
 * most obviously wrong thing that can happen in an assembly animation — and it
 * shipped, because the numbers came from the asset and the asset looked
 * authoritative.
 *
 * A loom is the last thing fitted to any assembly, for the same reason it is
 * the last thing on a real bench: it joins two things that both have to already
 * be there. So the cable goes last, and the two endpoints it joins are placed
 * before it:
 *
 *   16  controller   (was 17)
 *   17  display      (was 18)
 *   18  cable        (was 16)
 *
 * This is a remap and not an edit to the GLB on purpose. The asset is the
 * artist's; the order it is *assembled* in is this page's argument about how
 * the thing is built, and it belongs in the code that animates it.
 */
const FITTING_ORDER: Readonly<Record<number, number>> = {
  16: 18,
  17: 16,
  18: 17,
};

/** The order a part is actually fitted in, given the order the export declared. */
export function fittingOrder(exported: number): number {
  return FITTING_ORDER[exported] ?? exported;
}
