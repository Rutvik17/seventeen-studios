import { SectionHeader } from '@/components/SectionHeader';
import { Reveal } from '@/components/motion/Reveal';
import { RigDemo } from '@/components/instruments/RigDemo';

/**
 * The character, opened up.
 *
 * The companion has been following the reader down the page for four sections
 * by the time they arrive here, so this lands as an explanation of something
 * they already have a relationship with rather than as an unprompted tech demo.
 * That ordering is the reason the section sits below the instruments and above
 * the process, and it is worth preserving if the page is ever reshuffled.
 */
export function RigSection() {
  return (
    <section className="section rig-section" id="rig">
      <SectionHeader
        index="05"
        label="Under the hood"
        title={
          <p className="section-header__lead">
            The companion is not a video. Here are its constants — move them.
          </p>
        }
      />
      <Reveal className="rig-section__intro">
        <p>
          Everything Mochi does is integrated from forces: a damped spring for
          each degree of freedom, a pendulum on an accelerating pivot for the
          antenna, and analytic two-bone inverse kinematics for the arms. No
          keyframes, no sprite sheet, no recorded loop — which is why it never
          repeats and why an interrupted gesture carries its momentum into the
          next one.
        </p>
      </Reveal>
      <RigDemo />
    </section>
  );
}
