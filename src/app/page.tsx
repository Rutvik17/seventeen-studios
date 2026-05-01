/**
 * Homepage — composes every section in the order defined in CLAUDE.md.
 *
 * Order:
 *   Nav → Hero → Marquee → Manifesto → Services → Capabilities
 *       → Work (pinned horizontal) → Approach → Philosophy → Contact
 * The ServiceModals and CaseStudyModals are mounted at the bottom so the
 * store-backed overlays can render above every other section.
 */

import { Nav } from '@/components/Nav';
import { Hero } from '@/components/Hero';
import { Marquee } from '@/components/Marquee';
import { Manifesto } from '@/components/Manifesto';
import { Services } from '@/components/Services';
import { Capabilities } from '@/components/Capabilities';
import { Work } from '@/components/Work';
import { Approach } from '@/components/Approach';
import { Philosophy } from '@/components/Philosophy';
import { Contact } from '@/components/Contact';
import { ServiceModals } from '@/components/ServiceModal';
import { CaseStudyModals } from '@/components/CaseStudyModal';

export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <Manifesto />
        <Services />
        <Capabilities />
        <Work />
        <Approach />
        <Philosophy />
        <Contact />
      </main>
      <ServiceModals />
      <CaseStudyModals />
    </>
  );
}
