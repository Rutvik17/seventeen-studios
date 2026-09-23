/**
 * Whether the page is ready to be seen.
 *
 * The loader — on a full load, and the page-turn curtain between routes —
 * stays up until every part of the page that paints itself has painted. A
 * component that needs time (a canvas drawing its first frame, a layout that
 * switches mode once the script runs) calls `holdLoader()` as it mounts and
 * the release it returns once it is ready. What the reader sees first is the
 * finished page, never its pieces arriving on top of each other.
 *
 * `pageReady` has a ceiling: a hold that is never released must not keep the
 * page covered, so after `limit` it gives up and uncovers regardless.
 */

let holds = 0;
const waiting = new Set<() => void>();

export function holdLoader(): () => void {
  holds += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holds -= 1;
    if (holds === 0) waiting.forEach((check) => check());
  };
}

/** Resolves once nothing holds the loader, or after `limit` ms. */
export function pageReady(limit = 4000): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  return new Promise((resolve) => {
    let timer = 0;
    const done = () => {
      window.clearTimeout(timer);
      waiting.delete(check);
      resolve();
    };
    const check = () => {
      if (holds === 0) done();
    };
    timer = window.setTimeout(done, limit);
    waiting.add(check);
    // The components being waited for register their holds in their own
    // effects, which run after the loader's. Look once they have had the
    // chance: two frames on.
    requestAnimationFrame(() => requestAnimationFrame(check));
  });
}

/** The fonts, and every hold: everything the first look at a page depends on. */
export function everythingReady(limit = 4000): Promise<void> {
  const fonts = typeof document !== 'undefined' && document.fonts ? document.fonts.ready.then(() => undefined) : Promise.resolve();
  return Promise.all([fonts, pageReady(limit)]).then(() => undefined);
}

/**
 * The class the inline script in the document head puts on `<html>` before
 * the first paint, so the loader covers the page from the very first frame.
 * The loader takes it off when it leaves; the script also takes it off on its
 * own after `LOADING_FAILSAFE_MS`, so if the bundle never runs, the page is
 * never left covered.
 */
export const LOADING_CLASS = 'is-loading';
export const LOADING_FAILSAFE_MS = 8000;

export function doneLoading(): void {
  document.documentElement.classList.remove(LOADING_CLASS);
}
