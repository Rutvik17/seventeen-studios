'use client';

/**
 * Single concept-case card for the horizontal Work rail.
 *
 * - 58%-tall image placeholder (diagonal-stripe texture) on top
 * - Accent bar sweeps in on hover (pure CSS)
 * - Whole card tilts in 3D based on cursor position (GSAP)
 * - Click opens the corresponding case-study modal
 */

import { useRef } from 'react';
import gsap from 'gsap';
import { useModal } from '@/hooks/useModal';
import type { ModalId } from '@/lib/modal-store';

export interface WorkCardProps {
  tag: string;
  year?: string;
  title: string;
  description: string;
  placeholder: string; // multi-line placeholder text (use `\n` for line breaks)
  modalId: Extract<
    ModalId,
    'cs-pulse' | 'cs-forma' | 'cs-layer' | 'cs-echo' | 'cs-ark'
  >;
}

export function WorkCard({
  tag,
  year = 'Concept',
  title,
  description,
  placeholder,
  modalId,
}: WorkCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const { open } = useModal();

  // 3D tilt on cursor move — snap back elastically on leave.
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - r.left) / r.width - 0.5;
    const dy = (e.clientY - r.top) / r.height - 0.5;
    gsap.to(el, {
      rotateY: dx * 10,
      rotateX: -dy * 6,
      duration: 0.4,
      ease: 'power2.out',
    });
  };
  const onLeave = () => {
    const el = cardRef.current;
    if (!el) return;
    gsap.to(el, {
      rotateY: 0,
      rotateX: 0,
      duration: 0.7,
      ease: 'elastic.out(1,0.5)',
    });
  };

  return (
    <div
      ref={cardRef}
      className="work-card"
      role="button"
      tabIndex={0}
      onClick={() => open(modalId)}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open(modalId);
        }
      }}
    >
      <div className="work-card-img">
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
      <div className="work-card-accent" />
      <div className="work-card-body">
        <div className="work-card-meta">
          <span className="work-card-tag">{tag}</span>
          <span className="work-card-year">{year}</span>
        </div>
        <div className="work-card-title">{title}</div>
        <div className="work-card-desc">{description}</div>
        <div className="work-card-cta">Explore brief →</div>
      </div>
    </div>
  );
}
