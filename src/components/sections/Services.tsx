'use client';

/**
 * Services, as an expanding index.
 *
 * Each row is a button that opens the full offer inline — what you get, when
 * to call us, the engagement shape, the stack. A studio's services page is
 * usually four vague paragraphs; this is the whole thing, one click deep, with
 * an accent sweep that fills the row from the bottom on hover.
 */

import { useRef, useState, type ReactNode } from 'react';
import { gsap, ScrollTrigger, prefersReducedMotion } from '@/lib/gsap';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { services } from '@/content/services';
import { getConcept } from '@/content/work';
import { SectionHeader } from '@/components/SectionHeader';
import { Reveal } from '@/components/motion/Reveal';
import { TransitionLink } from '@/components/Transition';

export function Services() {
  const [open, setOpen] = useState<string | null>(services[0].id);

  const toggle = (id: string) => {
    setOpen(open === id ? null : id);
    // Panel heights change the page height, so pinned sections below need
    // remeasuring once the tween has settled.
    if (!prefersReducedMotion()) {
      window.setTimeout(() => ScrollTrigger.refresh(), 620);
    }
  };

  return (
    <section className="section services" id="services">
      <SectionHeader
        index="02"
        label="What we do"
        title={
          <p className="section-header__lead">
            Four services. Each one is a specific promise with a specific
            deliverable — open any of them for the whole offer.
          </p>
        }
      />

      <Reveal className="services__list" stagger interval={0.07}>
        {services.map((service) => {
          const isOpen = open === service.id;
          return (
            <div
              className={`service${isOpen ? ' is-open' : ''}`}
              key={service.id}
              id={`service-${service.id}`}
            >
              <button
                type="button"
                className="service__head"
                onClick={() => toggle(service.id)}
                aria-expanded={isOpen}
                aria-controls={`service-panel-${service.id}`}
                data-cursor={isOpen ? 'Close' : 'Open'}
              >
                <span className="service__sweep" aria-hidden="true" />
                <span className="mono-label service__index">{service.index}</span>
                <span className="service__title">{service.title}</span>
                <span className="service__summary">{service.summary}</span>
                <span className="service__toggle" aria-hidden="true">
                  <i />
                  <i />
                </span>
              </button>

              <ServicePanel id={service.id} open={isOpen}>
                <div className="service__panel-grid">
                  <div className="service__panel-main">
                    <p className="service__body">{service.body}</p>
                    <div className="service__tags">
                      {service.tags.map((tag) => (
                        <span className="tag" key={tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="service__panel-col">
                    <span className="mono-label">Call us when</span>
                    <ul className="service__signals">
                      {service.signals.map((signal) => (
                        <li key={signal}>{signal}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="service__panel-col">
                    <span className="mono-label">You receive</span>
                    <ul className="service__deliverables">
                      {service.deliverables.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="service__panel-col">
                    <span className="mono-label">Engagement</span>
                    <dl className="service__engagement">
                      <div>
                        <dt>Shape</dt>
                        <dd>{service.engagement.shape}</dd>
                      </div>
                      <div>
                        <dt>Duration</dt>
                        <dd>{service.engagement.duration}</dd>
                      </div>
                      <div>
                        <dt>Team</dt>
                        <dd>{service.engagement.team}</dd>
                      </div>
                    </dl>

                    <span className="mono-label">Typical stack</span>
                    <p className="service__stack">{service.stack.join(' · ')}</p>

                    {service.related.length > 0 ? (
                      <>
                        <span className="mono-label">Worked example</span>
                        <div className="service__related">
                          {service.related.map((slug) => {
                            const concept = getConcept(slug);
                            if (!concept) return null;
                            return (
                              <TransitionLink
                                href={`/work/${concept.slug}/`}
                                key={slug}
                                className="service__related-link"
                                data-cursor="Read brief"
                              >
                                {concept.name} — {concept.title}
                              </TransitionLink>
                            );
                          })}
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              </ServicePanel>
            </div>
          );
        })}
      </Reveal>
    </section>
  );
}

/**
 * Height animation for the expanding panel. `height: auto` is not animatable,
 * so GSAP measures the natural height, tweens from zero, then releases back to
 * auto so the panel stays responsive to viewport changes.
 */
function ServicePanel({
  id,
  open,
  children,
}: {
  id: string;
  open: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isFirstRun = useRef(true);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (prefersReducedMotion() || isFirstRun.current) {
      isFirstRun.current = false;
      gsap.set(el, { height: open ? 'auto' : 0, opacity: open ? 1 : 0 });
      return;
    }

    gsap.killTweensOf(el);
    if (open) {
      gsap.set(el, { height: 'auto', opacity: 1 });
      gsap.from(el, { height: 0, opacity: 0, duration: 0.6, ease: 'power3.inOut' });
    } else {
      gsap.to(el, { height: 0, opacity: 0, duration: 0.45, ease: 'power3.inOut' });
    }
  }, [open]);

  return (
    <div className="service__panel" id={`service-panel-${id}`} ref={ref}>
      <div className="service__panel-inner">{children}</div>
    </div>
  );
}
