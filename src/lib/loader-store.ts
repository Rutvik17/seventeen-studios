/**
 * Loader state — drives the hand-off from the pre-loader to the hero.
 *
 * The Loader component calls `markReady()` at the midpoint of its exit
 * animation so the Hero (and Nav) entrance timelines begin BEFORE the
 * loader's split-wipe finishes. That overlap is what makes the
 * transition feel continuous rather than "loader ends → hero starts".
 */

import { create } from 'zustand';

interface LoaderStore {
  ready: boolean;
  markReady: () => void;
}

export const useLoaderStore = create<LoaderStore>((set) => ({
  ready: false,
  markReady: () => set({ ready: true }),
}));
