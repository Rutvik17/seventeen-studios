/**
 * Run something the first time an element is on screen.
 *
 * ---
 *
 * WHY NOT SCROLLTRIGGER
 *
 * `Reveal` and `SplitText` both hide their content and then play it back with a
 * `once: true` ScrollTrigger. That is the right tool for anything scrubbed
 * against scroll position, and the wrong one for "has this appeared yet" — and
 * the difference is not academic, because when a ScrollTrigger's position is
 * computed wrongly the content it is holding stays hidden FOREVER.
 *
 * ScrollTrigger has to convert `top 88%` into an absolute scroll offset, and to
 * do that it needs the element's position, the height of the scroller and the
 * height of the viewport, all measured at refresh time and all still true later.
 * On the founder page none of that is safe: there is a pinned section above the
 * content, and iOS Safari changes the viewport height as its URL bar collapses,
 * which moves every offset computed against it. A trigger that resolves to a
 * scroll position the page never reaches simply never fires. The heading is
 * present, selectable, announced by a screen reader, and invisible — which is
 * exactly what was reported on a phone, twice, after two other explanations
 * turned out to be wrong.
 *
 * IntersectionObserver answers the actual question. It is the browser's own
 * account of whether the element is in the viewport: no measurement of ours, no
 * refresh to go stale, no dependence on which thing is driving the scroll. It
 * also fires immediately for something already on screen when observation
 * starts, which removes the special case `Reveal` was carrying by hand.
 *
 * ---
 *
 * IT FAILS OPEN
 *
 * No IntersectionObserver, and the callback runs at once. The content appears
 * without its animation, which is the correct way round: an un-animated heading
 * is a heading, and a hidden one is a bug. Anything that hides content has to
 * have an answer for what happens when the thing meant to unhide it does not
 * run.
 */

type Options = {
  /**
   * How far into view the element has to come, as a fraction of the viewport.
   *
   * 0.12 matches the `top 88%` the ScrollTrigger versions used: the bottom of
   * the observation box is pulled up by 12% of the viewport, so the callback
   * fires once the element's top has risen past 88% of the way down the screen.
   */
  enter?: number;
};

/** Returns a stop function. Safe to call more than once. */
export function onceInView(
  el: Element,
  run: () => void,
  { enter = 0.12 }: Options = {},
): () => void {
  if (typeof IntersectionObserver === 'undefined') {
    run();
    return () => {};
  }

  let observer: IntersectionObserver | null = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      stop();
      run();
    },
    { rootMargin: `0px 0px -${Math.round(enter * 100)}% 0px` },
  );

  const stop = () => {
    observer?.disconnect();
    observer = null;
  };

  observer.observe(el);
  return stop;
}
