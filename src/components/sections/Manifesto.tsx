import { manifesto } from '@/content/studio';
import { inline } from '@/lib/inline';
import { SectionHeader } from '@/components/SectionHeader';
import { SplitText } from '@/components/motion/SplitText';
import { Reveal } from '@/components/motion/Reveal';

export function Manifesto() {
  return (
    <section className="section manifesto" id="manifesto">
      <SectionHeader index="01" label={manifesto.label} />

      <div className="manifesto__body">
        <SplitText
          as="p"
          className="manifesto__lead"
          mode="words"
          stagger={0.02}
          duration={0.9}
        >
          {inline(manifesto.lead)}
        </SplitText>

        <Reveal className="manifesto__prose" stagger interval={0.12}>
          {manifesto.body.map((paragraph) => (
            <p key={paragraph.slice(0, 24)}>{inline(paragraph)}</p>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
