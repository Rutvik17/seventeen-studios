'use client';

import { useEffect, useRef } from 'react';
import { site } from '@/content/studio';
import { contactHref } from '@/lib/contact';

/**
 * A link to Rutvik's inbox that does not put the address in the export.
 *
 * ---
 *
 * WHY THIS COMPONENT EXISTS RATHER THAN A PLAIN `href={contactHref()}`
 *
 * That was the first attempt and it did not work, for a reason specific to
 * static export: `contactHref()` runs at BUILD time, so the assembled address
 * was serialised straight into the prerendered HTML. Splitting the string in
 * the source bought nothing — `grep -r "@gmail" out/` found it in five files.
 * The obfuscation has to survive to the artefact that ships, and the only
 * moment that happens after the export is written is on the client.
 *
 * So the address is attached to the DOM node after mount, by ref. React never
 * sees it, it is not in the HTML, it is not in the RSC payload, and it is not
 * in the JS bundle in one piece.
 *
 * ---
 *
 * WHAT A VISITOR WITHOUT JAVASCRIPT GETS
 *
 * A real link to his LinkedIn, where he can be messaged with no script at all.
 * Not a dead `#`, not a button that does nothing, not a tooltip saying "enable
 * JavaScript".
 *
 * This is the part worth being careful about. The obvious implementation
 * renders `<a href="#">` and swaps it on mount, which looks identical in every
 * browser the author tests and is broken for anyone the script fails to reach —
 * a blocked CDN, a slow connection abandoned early, a text browser, a scraper
 * building a link graph. Degrading to a page that can actually take a message
 * costs one attribute and removes the whole failure mode. It also means the
 * upgrade is genuinely an upgrade: mailto is the convenience, not the only door.
 */

/** Where the link goes until the address is attached. */
const FALLBACK = site.social.find((s) => s.label === 'LinkedIn')!.href;

type ContactLinkProps = {
  className?: string;
  /** The words on the link — required, so no page falls back to a stock label. */
  children: React.ReactNode;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'children'>;

export function ContactLink({
  className,
  children,
  ...rest
}: ContactLinkProps) {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Mutating the DOM directly, not via state: putting this in the render
    // path would hand the string back to React and it would reappear in the
    // hydration payload, which is the exact leak this component exists to fix.
    el.href = contactHref();
  }, []);

  return (
    <a ref={ref} href={FALLBACK} className={className} {...rest}>
      {children}
    </a>
  );
}
