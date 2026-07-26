import { SplitText } from '@/components/motion/SplitText';
import { Reveal } from '@/components/motion/Reveal';

/**
 * The statement. One sentence, scrubbed word by word against scroll position
 * so the reader sets the pace of the reveal.
 */
export function Philosophy() {
  return (
    <section className="section philosophy" id="philosophy">
      <span className="mono-label philosophy__label">Position</span>

      <SplitText
        as="h2"
        className="philosophy__quote"
        mode="words"
        scrub
        stagger={0.06}
        duration={0.8}
      >
        We don&rsquo;t ship features. We ship{' '}
        <em className="accent">conviction</em>, and the evidence behind it.
      </SplitText>

      <Reveal className="philosophy__foot" stagger interval={0.1}>
        <p>
          Anyone can write software that satisfies a ticket. The harder and rarer
          thing is a system whose every consequential decision someone can
          defend, in a meeting, eighteen months later, without you in the room.
        </p>
        <p>
          That is the standard we hold — before a client has asked us to, which
          is the only time the standard means anything.
        </p>
      </Reveal>
    </section>
  );
}
