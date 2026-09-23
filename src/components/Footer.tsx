'use client';

/**
 * The back endpaper of the sketchbook.
 *
 * Every sketchbook has the same thing inside its back cover: a bookplate with
 * the owner's name and where to send the book if it is found. This is that
 * page — the name, the city, a way to write, and the two places he is
 * elsewhere — with the small print (the book's number and the year) set along
 * the bottom edge the way a colophon is.
 *
 * It replaced a four-column site map, a full-width wordmark and a legal row:
 * a web footer, bolted onto the bottom of a book. The book has three sections
 * and they are in the tabs at the top; the endpaper does not need to list them
 * again.
 */

import { useEffect, useState } from 'react';
import { site, endpaper } from '@/content/studio';
import { ContactLink } from './ContactLink';

/**
 * `buildYear` is the year the export was built, passed in from the server so
 * the first paint is already correct; the effect re-reads the clock for a
 * visitor holding a cached page across New Year.
 */
export function Footer({ buildYear }: { buildYear: number }) {
  const [year, setYear] = useState(buildYear);
  useEffect(() => setYear(new Date().getFullYear()), []);

  return (
    <footer className="endpaper">
      <div className="endpaper__plate">
        <p className="endpaper__found">{endpaper.found}</p>
        <p className="endpaper__owner">{endpaper.owner}</p>
        <p className="endpaper__place">{endpaper.place}</p>
        <p className="endpaper__reach">
          <ContactLink className="endpaper__write" data-cursor="Write">
            {endpaper.write}
          </ContactLink>
          {site.social.map((item) => (
            <a key={item.label} href={item.href} target="_blank" rel="noreferrer noopener">
              {item.label}
            </a>
          ))}
        </p>
      </div>

      <div className="endpaper__edge">
        <span className="mono-label" suppressHydrationWarning>
          {endpaper.label} · © {year} {endpaper.owner}
        </span>
      </div>
    </footer>
  );
}
