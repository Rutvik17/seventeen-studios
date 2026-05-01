'use client';

/**
 * Generic modal shell.
 *
 * - Binds open/close to the zustand store so triggers anywhere in the tree
 *   can invoke it.
 * - Locks the page by calling `lenis.stop()` while open; restores on close.
 * - Handles backdrop click, escape key, and close-button click.
 * - Resets `scrollTop` of the inner box whenever a modal opens so users
 *   always land at the top of content.
 */

import { useEffect, useRef, type ReactNode } from 'react';
import { useModalStore, type ModalId } from '@/lib/modal-store';
import { getLenis } from '@/lib/lenis';

interface ModalProps {
  id: ModalId;
  tag: string;
  title: string;
  children: ReactNode;
}

export function Modal({ id, tag, title, children }: ModalProps) {
  const activeId = useModalStore((s) => s.activeId);
  const close = useModalStore((s) => s.close);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const isOpen = activeId === id;

  // On open: scroll internal box to top + lock page scroll.
  useEffect(() => {
    if (!isOpen) return;
    boxRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    const lenis = getLenis();
    lenis?.stop();
    document.body.style.overflow = 'hidden';
    return () => {
      lenis?.start();
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Escape key handler — only attached while open.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  return (
    <div
      className={`modal-overlay${isOpen ? ' open' : ''}`}
      id={`modal-${id}`}
      onClick={(e) => {
        // Close when clicking the backdrop itself (but not the inner box).
        if (e.target === e.currentTarget) close();
      }}
      role="dialog"
      aria-modal="true"
      aria-hidden={!isOpen}
    >
      <div className="modal-box" ref={boxRef}>
        <div className="modal-header">
          <div>
            <div className="modal-tag">{tag}</div>
            <div className="modal-title">{title}</div>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={close}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

/** Helper sub-components so each modal's content is terse. */
export function ModalSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="modal-section">
      <div className="modal-section-label">{label}</div>
      {children}
    </div>
  );
}

export function ModalMetrics({
  items,
}: {
  items: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="modal-metrics">
      {items.map((m) => (
        <div className="modal-metric" key={m.label}>
          <div className="modal-metric-val">{m.value}</div>
          <div className="modal-metric-label">{m.label}</div>
        </div>
      ))}
    </div>
  );
}

export function ModalStack({ tags }: { tags: string[] }) {
  return (
    <div className="modal-stack">
      {tags.map((t) => (
        <span key={t} className="modal-tag-item">
          {t}
        </span>
      ))}
    </div>
  );
}

/** Hero image placeholder block for case-study modals. */
export function ModalHeroImage({ placeholder }: { placeholder: string }) {
  return (
    <div className="modal-hero-img">
      <div className="work-stripe" />
      <div className="placeholder">
        {placeholder.split('\n').map((line, i, arr) => (
          <span key={i}>
            {line}
            {i < arr.length - 1 && <br />}
          </span>
        ))}
      </div>
    </div>
  );
}
