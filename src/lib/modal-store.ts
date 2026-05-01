/**
 * Modal state — a single-open-at-a-time store backed by zustand.
 *
 * Any component can call `useModalStore(s => s.open('svc-software'))` to
 * surface a modal. The Modal component reads `activeId` and the stack of
 * registered modals in its parent renders conditional content.
 */

import { create } from 'zustand';

export type ModalId =
  // services
  | 'svc-software'
  | 'svc-creative'
  | 'svc-ai'
  // case studies
  | 'cs-pulse'
  | 'cs-forma'
  | 'cs-layer'
  | 'cs-echo'
  | 'cs-ark';

interface ModalStore {
  activeId: ModalId | null;
  open: (id: ModalId) => void;
  close: () => void;
}

export const useModalStore = create<ModalStore>((set) => ({
  activeId: null,
  open: (id) => set({ activeId: id }),
  close: () => set({ activeId: null }),
}));
