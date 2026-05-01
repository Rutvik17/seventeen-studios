'use client';

/**
 * Contact + footer section.
 *
 * - Left column: headline + primary CTA (magnetic button with scramble on
 *   the inner label).
 * - Right column: info rows with underline separators.
 * - Footer: copyright, tagline, social links (with scramble text effect).
 */

import { useEffect, useRef } from 'react';
import { useMagnet } from '@/hooks/useMagnet';
import { RevealUp, RevealStagger, RevealWords, SectionLabel } from './Reveal';
import { scrambleText } from '@/lib/gsap-animations';

export function Contact() {
  const ctaRef = useRef<HTMLAnchorElement | null>(null);
  useMagnet(ctaRef);

  // Wire up scramble-on-hover for every [data-scramble] in this section.
  useEffect(() => {
    const nodes =
      document.querySelectorAll<HTMLElement>('#contact [data-scramble]');
    const bindings: Array<{ el: HTMLElement; handler: () => void }> = [];
    nodes.forEach((el) => {
      const original = el.textContent ?? '';
      const handler = () => scrambleText(el, original);
      el.addEventListener('mouseenter', handler);
      bindings.push({ el, handler });
    });
    return () => {
      bindings.forEach(({ el, handler }) =>
        el.removeEventListener('mouseenter', handler),
      );
    };
  }, []);

  return (
    <section id="contact" className="contact">
      <div className="contact-grid">
        <div>
          <RevealUp>
            <SectionLabel>Get in touch</SectionLabel>
          </RevealUp>
          <RevealWords as="h2" className="contact-headline">
            {"Let's build something "}
            <span>great.</span>
          </RevealWords>
          <RevealUp>
            <a
              ref={ctaRef}
              href="mailto:hello@seventeenstudios.com"
              className="contact-cta-btn magnetic"
            >
              <span data-scramble>Start a project</span>
              <span className="arrow">→</span>
            </a>
          </RevealUp>
        </div>
        <RevealStagger as="div" className="contact-right">
          <div className="contact-info-item">
            <span className="contact-info-label">Email</span>
            <a
              href="mailto:hello@seventeenstudios.com"
              className="contact-info-value"
            >
              hello@seventeenstudios.com
            </a>
          </div>
          <div className="contact-info-item">
            <span className="contact-info-label">New business</span>
            <a
              href="mailto:projects@seventeenstudios.com"
              className="contact-info-value"
            >
              projects@seventeenstudios.com
            </a>
          </div>
          <div className="contact-info-item">
            <span className="contact-info-label">Location</span>
            <span className="contact-info-value">Remote-first · Global</span>
          </div>
          <div className="contact-info-item">
            <span className="contact-info-label">Response time</span>
            <span className="contact-info-value">Within 24 hours</span>
          </div>
          <div className="contact-info-item">
            <span className="contact-info-label">Availability</span>
            <span
              className="contact-info-value"
              style={{ color: 'var(--accent)' }}
            >
              ● Open to new projects
            </span>
          </div>
        </RevealStagger>
      </div>
      <div className="footer-bottom">
        <span className="footer-copy">
          © 2026 Seventeen Studios. All rights reserved.
        </span>
        <span className="footer-tagline">Engineering the impossible</span>
        <div className="footer-links">
          <a href="#" data-scramble>
            Twitter
          </a>
          <a href="#" data-scramble>
            LinkedIn
          </a>
          <a href="#" data-scramble>
            GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
