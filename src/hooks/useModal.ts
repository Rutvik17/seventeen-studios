/**
 * Tiny ergonomic wrapper around the modal store.
 * Keeps component imports clean: `const { open, close } = useModal()`.
 */

import { useCallback } from 'react';
import { useModalStore, type ModalId } from '@/lib/modal-store';

export function useModal() {
  const activeId = useModalStore((s) => s.activeId);
  const openFn = useModalStore((s) => s.open);
  const closeFn = useModalStore((s) => s.close);

  const open = useCallback((id: ModalId) => openFn(id), [openFn]);
  const close = useCallback(() => closeFn(), [closeFn]);

  return { activeId, open, close };
}
