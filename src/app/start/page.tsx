import type { Metadata } from 'next';
import { site } from '@/content/studio';
import { BriefBuilder } from '@/components/BriefBuilder';
import { Reveal } from '@/components/motion/Reveal';
import { SplitText } from '@/components/motion/SplitText';

export const metadata: Metadata = {
  title: 'Start a brief',
  description:
    'Five questions, three minutes, and a reply from the person who would do the work.',
};

export default function StartPage() {
  return (
    <div className="page start">
      <header className="page-head">
        <span className="mono-label">Contact</span>
        <SplitText as="h1" className="page-head__title" stagger={0.03}>
          Start a brief
        </SplitText>
        <Reveal className="page-head__lead">
          <p>
            Five questions. Three minutes. The reply comes from the person who
            would do the work, within two working days — and if we are the wrong
            studio for it, we will say so and point you somewhere better.
          </p>
        </Reveal>
        <Reveal className="page-head__note">
          <span className="mono-label">Currently</span>
          <p>
            {site.availability}. We run two engagements at a time; if the slots
            are gone we will tell you when the next one opens rather than
            stretching the team.
          </p>
        </Reveal>
      </header>

      <BriefBuilder />
    </div>
  );
}
