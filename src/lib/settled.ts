/**
 * Wait until the main thread is actually free.
 *
 * ---
 *
 * WHY THIS EXISTS
 *
 * `gsap.ticker.lagSmoothing(0)` is set in `lib/gsap.ts` — Lenis drives the frame
 * loop and lag smoothing fights it. The cost is that GSAP no longer clamps a
 * long frame: after a stall, the next tick advances every running tween by the
 * whole elapsed time.
 *
 * Measured on this site: navigating to `/founder/` stalls the main thread for
 * 764 ms while React mounts the R3F canvas, WebGL creates a context and the
 * 2.1 MB model is parsed — ten frames over 100 ms in one navigation. The page
 * transition's uncover is about 700 ms of tween, so it is handed a delta longer
 * than itself and finishes in a single frame. The curtain does not lift; it
 * vanishes, and the founder page appears with no transition at all.
 *
 * A fixed delay does not fix this, because the stall is not a fixed length — it
 * depends on the device, the cache and whether the model is already parsed. So
 * this waits for the thing that actually matters: consecutive frames arriving on
 * time, which is the definition of the thread being free again.
 *
 * `timeoutMs` is a floor, not a target. If a page never settles, the animation
 * still runs rather than the curtain staying up forever — a late transition is
 * recoverable and a stuck one is not.
 */

type Options = {
  /** Consecutive on-time frames required. Two is enough to rule out a fluke. */
  frames?: number;
  /** A frame at or under this is "on time". ~2 frames at 60Hz. */
  budgetMs?: number;
  /** Give up waiting and run anyway. */
  timeoutMs?: number;
};

/** Returns a cancel function. */
export function whenSettled(
  run: () => void,
  { frames = 2, budgetMs = 34, timeoutMs = 2500 }: Options = {},
): () => void {
  if (typeof window === 'undefined') {
    run();
    return () => {};
  }

  let handle = 0;
  let cancelled = false;
  let onTime = 0;
  const started = performance.now();
  let previous = started;

  const tick = (now: number) => {
    if (cancelled) return;

    const delta = now - previous;
    previous = now;

    // A run of on-time frames, not a single one — the frame immediately after a
    // stall is often on time while the next is not.
    onTime = delta <= budgetMs ? onTime + 1 : 0;

    if (onTime >= frames || now - started >= timeoutMs) {
      run();
      return;
    }
    handle = requestAnimationFrame(tick);
  };

  handle = requestAnimationFrame(tick);

  return () => {
    cancelled = true;
    cancelAnimationFrame(handle);
  };
}
