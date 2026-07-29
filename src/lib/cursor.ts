/**
 * Lets a component clear the custom cursor's hover state.
 *
 * Needed because `pointerout` does not fire when the hovered element is removed
 * from the document — closing a dialog from its own close button left the
 * cursor stuck reading "Close" over the page behind it. `Cursor` also re-derives
 * its state from every `pointermove`, so this only has to cover the interval
 * before the pointer next moves.
 *
 * A DOM event rather than shared state: `Cursor` is mounted once in the root
 * layout, and callers should not have to reach it through a store.
 */

export const CURSOR_RESET_EVENT = 'cursor:reset';

export function resetCursor(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CURSOR_RESET_EVENT));
}
