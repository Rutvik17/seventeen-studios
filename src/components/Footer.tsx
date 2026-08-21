'use client';

import { useEffect, useState } from 'react';
import { site, nav } from '@/content/studio';
import { concepts } from '@/content/work';
import { products } from '@/content/products';
import { policies } from '@/content/policies';
import { essays } from '@/content/thinking';
import { TransitionLink } from './Transition';
import { ContactLink } from './ContactLink';
import { FitText } from './FitText';

/**
 * `buildYear` is the year the export was built, passed in from the server so
 * the first paint is already correct. The effect then re-reads the clock on the
 * client, which only matters for a visitor holding a cached page across New
 * Year — the copyright line corrects itself rather than waiting for a deploy.
 */
export function Footer({ buildYear }: { buildYear: number }) {
  const [year, setYear] = useState(buildYear);
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
          <span className="mono-label">Products</span>
          <ul>
            {products.map((product) => (
              <li key={product.slug}>
                <TransitionLink href={`/products/${product.slug}/`}>
                  {product.name}
                </TransitionLink>
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
                {'contact' in item ? (
                  <ContactLink>{item.label}</ContactLink>
                ) : (
                  <a
                    href={item.href}
                    target={item.href.startsWith('http') ? '_blank' : undefined}
                    rel="noreferrer noopener"
                  >
                    {item.label}
                  </a>
                )}
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
          © {year} {site.name}
        </span>
        <span className="mono-label">{site.location}</span>
        {/*
          The legal pages live down here rather than in the nav because that is
          where every visitor already looks for them — and App Store review
          follows the same habit when it goes checking that the privacy policy
          for a submitted app is actually reachable from the site that hosts it.
        */}
        <ul className="footer__legal">
          {policies.map((policy) => (
            <li key={policy.slug}>
              <TransitionLink href={`/legal/${policy.slug}/`}>
                {policy.title}
              </TransitionLink>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
