'use client';

/**
 * A single service card — number, title, body, tags, arrow button.
 * Arrow opens a modal corresponding to the card's `modalId`.
 * The accent-colour wipe-up on hover is pure CSS; see `.service-card::before`.
 */

import { useRef } from 'react';
import { useMagnet } from '@/hooks/useMagnet';
import { useModal } from '@/hooks/useModal';
import type { ModalId } from '@/lib/modal-store';

export interface ServiceCardProps {
  number: string;
  title: string;
  body: string;
  tags: string[];
  modalId: Extract<ModalId, 'svc-software' | 'svc-creative' | 'svc-ai'>;
}

export function ServiceCard({
  number,
  title,
  body,
  tags,
  modalId,
}: ServiceCardProps) {
  const arrowRef = useRef<HTMLButtonElement | null>(null);
  useMagnet(arrowRef);
  const { open } = useModal();

  return (
    <div className="service-card">
      <div className="svc-num">{number}</div>
      <div className="svc-title">{title}</div>
      <p className="svc-body">{body}</p>
      <div className="svc-tags">
        {tags.map((t) => (
          <span key={t} className="svc-tag">
            {t}
          </span>
        ))}
      </div>
      <button
        ref={arrowRef}
        type="button"
        className="svc-arrow magnetic"
        aria-label={`Open ${title} details`}
        onClick={(e) => {
          e.stopPropagation();
          open(modalId);
        }}
      >
        →
      </button>
    </div>
  );
}
