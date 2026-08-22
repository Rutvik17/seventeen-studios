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
  /** Renders the card's live preview, by id. */
  preview: 'board' | 'derivative' | 'montecarlo' | 'credit' | 'companion';
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
    preview: 'derivative',
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
    preview: 'montecarlo',
  },
  {
    slug: 'credit-risk',
    index: '03',
    name: 'Cardholder risk model',
    line: 'Expected loss on a credit profile, decomposed into PD, LGD and EAD.',
    metric: 'Basel-standard decomposition, every term exposed',
    status: 'In progress',
    stack: ['TypeScript', 'Credit risk', 'Canvas'],
    href: '/lab/#credit',
    preview: 'credit',
  },
  {
    slug: 'companion',
    index: '04',
    name: 'Mochi',
    line: 'A character rigged on springs, a pendulum and two-bone inverse kinematics.',
    metric: 'No keyframes anywhere — every pose is integrated',
    status: 'Live demo',
    stack: ['Canvas', 'Physics', 'TypeScript'],
    href: '/lab/#companion',
    preview: 'companion',
  },
  {
    slug: 'companion-device',
    index: '05',
    name: 'The companion device',
    line: 'An ESP32 board driving a three-colour e-ink panel, showing data as a face.',
    metric: '0.93 mA average · 45 days on a 1200 mAh cell',
    status: 'Designing',
    stack: ['ESP32-C3', 'E-ink', 'KiCad', 'C++'],
    href: '/#top',
    preview: 'board',
  },
];
