import { capabilities } from '@/content/studio';
import { SectionHeader } from '@/components/SectionHeader';
import { Reveal } from '@/components/motion/Reveal';

export function Capabilities() {
  return (
    <section className="section capabilities" id="capabilities">
      <SectionHeader
        index="03"
        label="Capabilities"
        title={
          <p className="section-header__lead">
            Eight areas we go deep in. Everything else, we will tell you who to
            call.
          </p>
        }
      />

      <Reveal className="capabilities__grid" stagger interval={0.05}>
        {capabilities.map((capability, index) => (
          <article className="capability" key={capability.title}>
            <span className="mono-label capability__index">
              {String(index + 1).padStart(2, '0')}
            </span>
            <h3 className="capability__title">{capability.title}</h3>
            <p className="capability__body">{capability.description}</p>
          </article>
        ))}
      </Reveal>
    </section>
  );
}
