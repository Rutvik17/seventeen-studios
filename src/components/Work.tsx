'use client';

/**
 * Work section — a horizontally pinned scroll rail of 5 concept-case cards.
 *
 * `useHorizontalScroll` pins the section and translates the inner track
 * horizontally as the user scrolls vertically. The header absolutely
 * positions on top so it stays legible while the cards rail past.
 */

import { useRef } from 'react';
import { useHorizontalScroll } from '@/hooks/useHorizontalScroll';
import { WorkCard, type WorkCardProps } from './WorkCard';

const CASES: WorkCardProps[] = [
  {
    tag: 'AI Engineering',
    title: 'Pulse',
    description:
      'AI-native market intelligence platform with real-time signal processing.',
    placeholder:
      'Concept — Pulse AI\nreal-time market intelligence platform',
    modalId: 'cs-pulse',
  },
  {
    tag: 'Creative Engineering',
    title: 'Forma',
    description:
      'Generative WebGL brand experience built around real-time cloth simulation.',
    placeholder:
      'Concept — Forma\ngenerative 3D brand experience',
    modalId: 'cs-forma',
  },
  {
    tag: 'Software Engineering',
    title: 'Layer',
    description:
      'Distributed event streaming architecture for high-frequency data workloads.',
    placeholder:
      'Concept — Layer\ndistributed data infrastructure',
    modalId: 'cs-layer',
  },
  {
    tag: 'AI · Creative',
    title: 'Echo',
    description:
      'Multimodal AI platform for music production and sound design workflows.',
    placeholder:
      'Concept — Echo\nAI audio intelligence product',
    modalId: 'cs-echo',
  },
  {
    tag: 'Product · Software',
    title: 'Ark',
    description:
      'Mobile-first AI companion for personal knowledge management and recall.',
    placeholder:
      'Concept — Ark\nAI-powered mobile companion app',
    modalId: 'cs-ark',
  },
];

export function Work() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  useHorizontalScroll(sectionRef, trackRef);

  return (
    <section id="work" ref={sectionRef} className="work-section">
      <div className="work-header">
        <div className="work-title-wrap">
          <div className="section-label">Concept Work</div>
          <h2 className="work-title">What we can build</h2>
          <div className="work-count">Click any card to explore the brief →</div>
        </div>
      </div>
      <div className="work-track" ref={trackRef}>
        <div className="work-track-inner">
          {/* Leading spacer — matches the design reference */}
          <div style={{ width: 24, flexShrink: 0 }} />
          {CASES.map((c) => (
            <WorkCard key={c.modalId} {...c} />
          ))}
          <div style={{ width: 48, flexShrink: 0 }} />
        </div>
      </div>
    </section>
  );
}
