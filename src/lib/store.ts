'use client';

/**
 * Small global UI store.
 *
 * Three pieces of state need to be readable from unrelated parts of the tree:
 * whether the preloader has finished (gates every entrance animation), whether
 * the index overlay is open, and whether a page transition is covering the
 * screen. Everything else stays local to its component.
 */

import { create } from 'zustand';

interface UiState {
  /** Set once the preloader curtain has cleared. */
  entered: boolean;
  enter: () => void;
  /** Full-screen index overlay. */
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  toggleMenu: () => void;
}

export const useUi = create<UiState>((set) => ({
  entered: false,
  enter: () => set({ entered: true }),
  menuOpen: false,
  setMenuOpen: (menuOpen) => set({ menuOpen }),
  toggleMenu: () => set((state) => ({ menuOpen: !state.menuOpen })),
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
