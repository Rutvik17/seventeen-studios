import { WorldHero } from '@/components/sections/WorldHero';
import { Marquee } from '@/components/Marquee';
import { Craft } from '@/components/sections/Craft';
import { Services } from '@/components/sections/Services';
import { Proof } from '@/components/sections/Proof';
import { ProductFeature } from '@/components/sections/ProductFeature';
import { RigSection } from '@/components/sections/RigSection';
import { WorkGallery } from '@/components/sections/WorkGallery';
import { Process } from '@/components/sections/Process';
import { ThinkingPreview } from '@/components/sections/ThinkingPreview';
import { ContactCta } from '@/components/sections/ContactCta';
import { Companion } from '@/components/Companion';
import { marqueeItems } from '@/content/studio';

/**
 * The home page, as a walk.
 *
 * The order is an argument, and it is deliberately not the order an agency site
 * usually runs in:
 *
 *   world  — you arrive somewhere before you are sold anything
 *   craft  — what the studio IS, in numbers rather than adjectives
 *   services — what it does
 *   proof  — a working instrument, because there are no client logos yet
 *   products — the thing the studio shipped on its own account
 *   rig    — the companion opened up, once you have met it
 *   work   — concept briefs, clearly labelled speculative
 *   process, thinking, contact
 *
 * Evidence before hypotheticals: the shipped product and the live instrument
 * both come BEFORE the concept briefs, so a reader forms their impression from
 * the real things first. `Companion` reads the section ids on this page to know
 * what to say and when — the ids here and the cues in `content/companion.ts`
 * are one contract, so renaming a section means renaming its cue.
 */
export default function HomePage() {
  return (
    <>
      <WorldHero />
      <Marquee items={marqueeItems} />
      <Craft />
      <Services />
      <Proof />
      <ProductFeature />
      <RigSection />
      <WorkGallery />
      <Process />
      <ThinkingPreview />
      <ContactCta />
      <Companion />
    </>
  );
}
