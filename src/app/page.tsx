import { Hero } from '@/components/sections/Hero';
import { Marquee } from '@/components/Marquee';
import { ProjectIndex } from '@/components/sections/ProjectIndex';
import { Outro } from '@/components/sections/Outro';
import { marqueeItems } from '@/content/studio';

/**
 * The landing.
 *
 * Three things, in this order: two pendulums coming apart, the list of what has
 * been built, and one question.
 *
 * There is no manifesto, no process diagram, no set of principles and no
 * paragraph explaining what any of it means. All of that was here and all of it
 * was working against the site's actual job — a reviewer looking for evidence
 * that someone can engineer will play with a thing that moves long before they
 * read a claim that they could.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <Marquee items={marqueeItems} />
      <ProjectIndex />
      <Outro />
    </>
  );
}
