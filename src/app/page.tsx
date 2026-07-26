import { Hero } from '@/components/sections/Hero';
import { Marquee } from '@/components/Marquee';
import { Manifesto } from '@/components/sections/Manifesto';
import { Services } from '@/components/sections/Services';
import { Capabilities } from '@/components/sections/Capabilities';
import { WorkGallery } from '@/components/sections/WorkGallery';
import { Process } from '@/components/sections/Process';
import { ThinkingPreview } from '@/components/sections/ThinkingPreview';
import { Philosophy } from '@/components/sections/Philosophy';
import { ContactCta } from '@/components/sections/ContactCta';
import { marqueeItems } from '@/content/studio';

export default function HomePage() {
  return (
    <>
      <Hero />
      <Marquee items={marqueeItems} />
      <Manifesto />
      <Services />
      <Capabilities />
      <WorkGallery />
      <Process />
      <ThinkingPreview />
      <Philosophy />
      <ContactCta />
    </>
  );
}
