import type { CompanionPose } from '@/lib/companion';

/**
 * What Mochi says, and where.
 *
 * Content as data (rule 3) — the character's script is copy, and copy does not
 * live in a component. Each cue is keyed to a section id on the page; the
 * companion watches which section is in view and says the matching line.
 *
 * ---
 *
 * THE VOICE
 *
 * Short. A guide, not a mascot with a catchphrase. It says the thing a good
 * salesperson would say standing next to you — the honest framing of what you
 * are looking at — and then stops talking. Every line has to survive being read
 * by someone who came here to hire an engineer, which rules out cute for its
 * own sake.
 *
 * It never claims a client, a testimonial or a metric the studio does not have
 * (rule 6). A friendly narrator is exactly where that rule would be easiest to
 * break and hardest to notice.
 */

export type CompanionCue = {
  /** `id` of the section this line belongs to. */
  section: string;
  lines: string[];
  pose: CompanionPose;
};

/** Said once, on arrival, before any section is in view. */
export const companionIntro: CompanionCue = {
  section: '__intro',
  pose: 'wave',
  lines: [
    'Hi. I’m Mochi.',
    'Everything I do here is simulated — springs, a pendulum, two-bone IK. No keyframes.',
    'Scroll, and I’ll walk you round.',
  ],
};

export const companionCues: CompanionCue[] = [
  {
    section: 'craft',
    pose: 'point',
    lines: [
      'This is the workshop.',
      'Small studio. Senior hands. The people you meet are the people who write it.',
    ],
  },
  {
    section: 'services',
    pose: 'idle',
    lines: [
      'Four things we do properly, rather than twelve we’d have to learn on your budget.',
    ],
  },
  {
    section: 'proof',
    pose: 'think',
    lines: [
      'No client logos yet — so instead, working instruments.',
      'The numbers below are computed in your browser, right now. Move the inputs and watch them move.',
    ],
  },
  {
    section: 'products',
    pose: 'point',
    lines: [
      'Grasp is ours. Nine lessons, four surfaces each, 887 tests on the arithmetic alone.',
    ],
  },
  {
    section: 'rig',
    pose: 'cheer',
    lines: [
      'And this is me, taken apart.',
      'Change a number and I change with it. That’s the whole demo — no hidden layer.',
    ],
  },
  {
    section: 'process',
    pose: 'idle',
    lines: ['Week one we try to disprove your brief. It saves everyone money.'],
  },
  {
    section: 'thinking',
    pose: 'think',
    lines: ['We publish the reasoning before anyone pays for it. Read it and argue.'],
  },
  {
    section: 'contact',
    pose: 'wave',
    lines: ['That’s the tour. If it’s your kind of thing, say hello.'],
  },
];

/** Shown in place of the animation when the visitor has asked for less motion. */
export const companionStaticLine =
  'Mochi — the studio’s companion. Rigged on springs, a pendulum and two-bone inverse kinematics.';
