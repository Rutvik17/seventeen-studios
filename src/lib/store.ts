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
 * Whether this session has already been through the loader. The first full
 * load of a session gets the loader's whole drawing; later ones — reloads, a
 * page opened in a new tab — get a quicker one.
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
