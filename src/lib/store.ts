'use client';

/**
 * Small global UI store.
 *
 * One piece of state needs to be readable from unrelated parts of the tree:
 * whether the preloader has finished, which gates every entrance animation.
 * Everything else stays local to its component.
 */

import { create } from 'zustand';

interface UiState {
  /** Set once the preloader curtain has cleared. */
  entered: boolean;
  enter: () => void;
}

export const useUi = create<UiState>((set) => ({
  entered: false,
  enter: () => set({ entered: true }),
}));

/**
 * The preloader only runs on the first visit of a session. Subsequent
 * client-side navigations (and reloads within the session) skip straight to
 * the content — an unskippable four-second curtain on every page would be a
 * hostile piece of choreography.
 */
const SESSION_KEY = 'seventeen:entered';

export function hasEnteredThisSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    // Private-mode Safari throws on sessionStorage access.
    return false;
  }
}

export function markEnteredThisSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    /* no-op */
  }
}
