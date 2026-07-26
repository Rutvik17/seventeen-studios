'use client';

import { useEffect, useState } from 'react';
import { site, nav } from '@/content/studio';
import { concepts } from '@/content/work';
import { essays } from '@/content/thinking';
import { TransitionLink } from './Transition';
import { FitText } from './FitText';

export function Footer() {
  const [year, setYear] = useState<number | null>(null);
  useEffect(() => setYear(new Date().getFullYear()), []);

  return (
    <footer className="footer">
      <div className="footer__grid">
        <div className="footer__col">
          <span className="mono-label">Studio</span>
          <ul>
            {nav.map((item) => (
              <li key={item.href}>
                <TransitionLink href={item.href}>{item.label}</TransitionLink>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer__col">
          <span className="mono-label">Concept briefs</span>
          <ul>
            {concepts.map((concept) => (
              <li key={concept.slug}>
                <TransitionLink href={`/work/${concept.slug}/`}>
                  {concept.name}
                </TransitionLink>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer__col">
          <span className="mono-label">Recent writing</span>
          <ul>
            {essays.slice(0, 4).map((essay) => (
              <li key={essay.slug}>
                <TransitionLink href={`/thinking/${essay.slug}/`}>
                  {essay.title}
                </TransitionLink>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer__col">
          <span className="mono-label">Elsewhere</span>
          <ul>
            {site.social.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  target={item.href.startsWith('http') ? '_blank' : undefined}
                  rel="noreferrer noopener"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <FitText className="footer__wordmark" maxPx={340}>
        <span aria-hidden="true">
          {site.wordmark}
          <span className="accent">.</span>
        </span>
      </FitText>

      <div className="footer__base">
        <span className="mono-label" suppressHydrationWarning>
          © {year ?? site.founded} {site.name}
        </span>
        <span className="mono-label">{site.location}</span>
        <span className="mono-label">
          Built as a static site · Next.js, GSAP, Three.js
        </span>
      </div>
    </footer>
  );
}
