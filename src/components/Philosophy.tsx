/**
 * Philosophy quote — centred single-line statement with word-reveal on scroll.
 * "conviction." is accent-coloured via `<em>` (see `.philosophy-quote em`).
 */

import { RevealUp, RevealWords } from './Reveal';

export function Philosophy() {
  return (
    <section id="philosophy" className="philosophy">
      <RevealWords as="p" className="philosophy-quote">
        {"We don't ship features. We ship "}
        <em>conviction.</em>
      </RevealWords>
      <RevealUp as="div" className="philosophy-attr">
        — The Seventeen Doctrine
      </RevealUp>
    </section>
  );
}
