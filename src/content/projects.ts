/**
 * The work, as a list of things that run.
 *
 * ---
 *
 * EVERY ENTRY HERE IS A DEMONSTRATION, NOT A DESCRIPTION
 *
 * The rule for this file: if a project cannot be *operated* on the site, it
 * does not get a card. No screenshots of dashboards, no "case studies" of work
 * nobody can inspect, no mockups. A reviewer skimming a portfolio for evidence
 * of ability will play with one thing that moves before they read a single
 * paragraph, so the only entries worth having are the ones they can play with.
 *
 * `status` is honest about which of these are shipped and which are in
 * progress. A portfolio that presents an intention as a product is the fastest
 * way to lose a technical reader, and being straight about it costs nothing —
 * "building" against a working prototype reads as momentum.
 */

export type ProjectStatus = 'Shipped' | 'Live demo' | 'In progress' | 'Designing';

export type Project = {
  slug: string;
  index: string;
  name: string;
  /** One line. What it is, not why it matters. */
  line: string;
  /** The single most checkable fact about it. */
  metric?: string;
  status: ProjectStatus;
  stack: string[];
  href: string;
  /**
   * The wash this row brings to the page on hover, and the ink that sits on it.
   *
   * Pairs, not single colours, because the ink has to pass contrast against its
   * own wash — picking a background and hoping the site's default text colour
   * survives is how these effects end up unreadable on two rows out of five.
   * Every pair below clears 4.5:1.
   */
  color: string;
  ink: string;
};

export const projects: Project[] = [
  {
    slug: 'grasp',
    index: '01',
    name: 'Grasp',
    line: 'An iOS app that teaches calculus by making every idea something you drag.',
    metric: 'Nine lessons · 887 tests on the arithmetic alone',
    status: 'Shipped',
    stack: ['React Native', 'Skia', 'Reanimated', 'TypeScript'],
    href: '/products/grasp/',
    color: '#dce5fc',
    ink: '#12379c',
  },
  {
    slug: 'monte-carlo',
    index: '02',
    name: 'Portfolio risk desk',
    line: 'Monte Carlo value-at-risk on real market data, recomputed in the browser.',
    metric: 'Simulation checked against the closed form, live',
    status: 'Live demo',
    stack: ['TypeScript', 'Quantitative finance', 'SVG'],
    href: '/lab/#risk',
    color: '#f7e4c8',
    ink: '#7a4410',
  },
  {
    slug: 'credit-risk',
    index: '03',
    name: 'Cardholder risk model',
    line: 'Expected loss on a credit profile, decomposed into PD, LGD and EAD.',
    metric: 'Correlation moves required capital by 50x on the same book',
    status: 'Live demo',
    stack: ['TypeScript', 'Credit risk', 'Canvas'],
    href: '/lab/#credit',
    color: '#d9e9db',
    ink: '#1d5632',
  },
  {
    slug: 'companion',
    index: '04',
    /*
      The character is called Mochi, and its name was the title here — which
      told a reader nothing about what was built. The row now says what the work
      IS and keeps the name in the line under it, where it belongs.
    */
    name: 'Physics character rig',
    line: 'Mochi: a character rigged on springs, a pendulum and two-bone inverse kinematics.',
    metric: 'No keyframes anywhere — every pose is integrated',
    status: 'Live demo',
    stack: ['Canvas', 'Physics', 'TypeScript'],
    href: '/lab/#companion',
    color: '#f8dde1',
    ink: '#8f2338',
  },
  {
    slug: 'companion-device',
    index: '05',
    name: 'E-ink companion device',
    line: 'An ESP32 board driving two displays — seven-colour e-paper for the numbers, a small OLED for the face that reads them.',
    metric: '0.93 mA average · 45 days on a 1200 mAh cell',
    status: 'Designing',
    stack: ['ESP32-C3', 'E-ink', 'KiCad', 'C++'],
    /*
      The founder page, where the same device is built as an object rather than
      drawn. This used to point at `/#top` — back to the top of the page the
      card is already on — which looked like a link and did nothing.
    */
    href: '/founder/',
    color: '#d3e3da',
    ink: '#123f33',
  },
];
