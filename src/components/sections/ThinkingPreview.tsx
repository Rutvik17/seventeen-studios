'use client';

/**
 * Writing index with a cursor-following preview.
 *
 * Hovering a row fades in that essay's generative poster and floats it with
 * the pointer. The preview is one shared element that swaps content rather
 * than one per row — cheaper, and it lets the artwork travel between rows
 * instead of popping.
 */

import { useRef, useState } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/gsap';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { essays, essayReadingTime } from '@/content/thinking';
import { SectionHeader } from '@/components/SectionHeader';
import { Reveal } from '@/components/motion/Reveal';
import { TransitionLink } from '@/components/Transition';
import { Poster } from '@/components/Poster';

export function ThinkingPreview() {
  const ref = useRef<HTMLElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    const preview = previewRef.current;
    if (!el || !preview) return;
    if (prefersReducedMotion()) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const ctx = gsap.context(() => {
      const moveX = gsap.quickTo(preview, 'x', { duration: 0.7, ease: 'power3.out' });
      const moveY = gsap.quickTo(preview, 'y', { duration: 0.7, ease: 'power3.out' });

      const onMove = (event: PointerEvent) => {
        const rect = el.getBoundingClientRect();
        moveX(event.clientX - rect.left - 150);
        moveY(event.clientY - rect.top - 150);
      };

      el.addEventListener('pointermove', onMove);
      return () => el.removeEventListener('pointermove', onMove);
    }, el);

    return () => ctx.revert();
  }, []);

  useIsomorphicLayoutEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;
    if (prefersReducedMotion()) return;
    gsap.to(preview, {
      autoAlpha: active === null ? 0 : 1,
      scale: active === null ? 0.85 : 1,
      duration: 0.45,
      ease: 'power3.out',
    });
  }, [active]);

  return (
    <section className="section thinking" id="thinking" ref={ref}>
      <SectionHeader
        index="06"
        label="Thinking"
        title={
          <p className="section-header__lead">
            The studio publishes its reasoning. Read it before you brief us —
            that is the point of it being here.
          </p>
        }
        action={
          <TransitionLink href="/thinking/" className="link-arrow" data-cursor="Read all">
            All writing <i aria-hidden="true">→</i>
          </TransitionLink>
        }
      />

      <div className="thinking__preview" ref={previewRef} aria-hidden="true">
        {active !== null ? (
          <Poster family="flow" seed={essays[active].seed} />
        ) : null}
      </div>

      <Reveal className="thinking__list" stagger interval={0.06}>
        {essays.slice(0, 4).map((essay, index) => (
          <TransitionLink
            href={`/thinking/${essay.slug}/`}
            className="thinking__row"
            key={essay.slug}
            data-cursor="Read"
            onPointerEnter={() => setActive(index)}
            onPointerLeave={() => setActive(null)}
          >
            <span className="mono-label thinking__index">{essay.index}</span>
            <span className="thinking__title">{essay.title}</span>
            <span className="thinking__topic mono-label">{essay.topic}</span>
            <span className="thinking__time mono-label">{essayReadingTime(essay)}</span>
          </TransitionLink>
        ))}
      </Reveal>
    </section>
  );
}
