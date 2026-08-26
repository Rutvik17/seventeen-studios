/**
 * The e-ink panel's specification — ONE OF THE DEVICE'S TWO DISPLAYS.
 *
 * The board carries an ACeP e-paper panel and a small RGB OLED, and that is an
 * engineering decision rather than an indulgence: neither part can do the
 * other's job.
 *
 *   - this panel, a 4.01" seven-colour ACeP, holds the READOUT. It costs no
 *     power at all to keep an image, so the price and the timestamp are free
 *     between refreshes. It cannot animate — about thirty seconds per refresh,
 *     flashing through the whole palette, with no partial-refresh mode.
 *
 *   - a 1.5" SSD1351 RGB OLED, specified in `lib/oled.ts`, carries the
 *     COMPANION. It is emissive, addressable by window, and redraws a character
 *     in 2.15 ms. It costs current every second it is lit — enough to take the
 *     device from nineteen days on a charge to four and a half.
 *
 * Asking one panel to do both is what forces a compromise. e-paper cannot move;
 * an OLED cannot hold a picture for a fortnight on a small cell. So the numbers
 * live on the part that is free to keep them and the character lives on the
 * part that can move, and each pays only for what it is good at.
 *
 * The companion's FACE used to live here and is now `lib/face.ts`. It grew from
 * a 16 x 16 bitmap of eyes and a mouth into a 24 x 24 composed from brows, eyes
 * and mouth as separate layers — and brows are most of what a face does, so the
 * split earned a file of its own.
 */

/**
 * Which of the panel's colours a mood should be drawn in.
 *
 * Red for a fall and green for a rise, because that is the convention every
 * reader of a market screen already has — and a convention the audience already
 * holds is worth more than any palette chosen for its own sake.
 */
export function inkFor(sigmas: number): 'green' | 'red' | 'black' {
  if (sigmas > 0.25) return 'green';
  if (sigmas < -0.25) return 'red';
  return 'black';
}

/**
 * Display geometry — a real 4.01" seven-colour ACeP module.
 *
 * ---
 *
 * WHY THIS PART AND NOT THE 2.9" IT REPLACED
 *
 * A market readout wants red for down and green for up, and a three-colour
 * panel physically cannot do that: it holds black pigment, white pigment and
 * ONE accent. Red or yellow, never both, and never green. Colouring a fall red
 * and a rise green on such a panel would be drawing a device that cannot exist.
 *
 * ACeP — Advanced Color ePaper — stacks pigments of several colours in each
 * capsule and drives them out selectively, which gives seven. It is a real,
 * purchasable part and it is the honest way to get the readout that was asked
 * for.
 *
 * ---
 *
 * WHAT IT COSTS, STATED PLAINLY
 *
 * It is very slow: a full refresh is around thirty seconds against fifteen for
 * the three-colour panel, because every pigment has to be driven to its own
 * position in turn. There is no partial refresh at all. And the colours are
 * muted — the pigments are not dyes and cannot be saturated — so the palette
 * below is deliberately desaturated rather than screen-bright.
 *
 * That suits this device exactly. It changes a few times an hour and is read
 * from across a room.
 */
export const PANEL = {
  width: 640,
  height: 400,
  /** Active area, mm. */
  mmWidth: 81.6,
  mmHeight: 51.0,
  /** The module including its bezel, mm. */
  moduleWidth: 91.0,
  moduleHeight: 60.4,
  /**
   * Full-refresh time in seconds.
   *
   * Not a guess. Every pigment has to be driven to position in sequence, and
   * the panel flashes through its whole palette while it works. It is the reason
   * these are used for things that change hourly and never for anything
   * interactive — and the page says so rather than animating a refresh that
   * would be dishonest.
   */
  refreshSeconds: 30,
  /**
   * A LIVE CLOCK IS THE ONE THING THIS PART CANNOT DO.
   *
   * The panel on the landing page ticks every minute, because on a web page it
   * is a picture and a picture can be redrawn. The real module could not: an
   * ACeP refresh takes about thirty seconds, flashes through its whole palette
   * while it works, and has no partial-refresh mode at all — so a per-minute
   * clock would leave the display strobing for half of every minute.
   *
   * Wanting a clock is therefore a real constraint on the part, not a firmware
   * detail. A two-colour panel HAS partial refresh, updates a small region in
   * under a second, and would show a clock perfectly — at the cost of the red
   * and green the market readout uses. That is a genuine trade and the device
   * has to pick one.
   *
   * The drawing shows the clock because it is demonstrating the layout. The
   * shipped firmware would show the capture time instead.
   */
  hasPartialRefresh: false,
} as const;
