/**
 * The founder.
 *
 * Ported from the founder page in `llm-vs-market` and rewritten for this site.
 * One distinction is load-bearing and must not blur: the engagements below are
 * Rutvik's professional record — work delivered inside the companies named, not
 * client work delivered by Seventeen Studios. The studio's own work is in
 * `work.ts` and is labelled as concept briefs. Keep the two separate.
 */

import { foundedYear, yearsOfExperience, spell, spellCapitalised } from '@/lib/time';
import { asset } from '@/lib/asset';

const years = yearsOfExperience();

export const founder = {
  name: 'Rutvik Patel',
  initials: 'RP',
  role: 'Founder · Principal Engineer',
  location: 'Toronto, Canada',
  portrait: asset('/founder/rutvik-patel.jpg'),
  portraitAlt: 'Rutvik Patel, founder and principal engineer at Seventeen Studios',
  resume: asset('/founder/rutvik-patel-resume.pdf'),
  github: 'https://github.com/Rutvik17',
  /** One line, used for metadata and the studio-page cross-link. */
  summary: `Principal engineer with ${spell(years)} years building interfaces and platforms at enterprise scale — agentic AI at Ernst & Young, a mobile product taken from zero to acquisition, connected-vehicle infrastructure at Ford.`,
  /** Shown under the name in the hero. */
  standfirst:
    'I started Seventeen Studios because the best engineering I have done was always the work where one person stayed accountable from the architecture through to the last deploy. This is that, made deliberate.',
} as const;

/** The three-sentence position. Accented fragments render in the accent colour. */
export const founderStatement: { lead: string; accent: string; tail: string }[] = [
  {
    lead: 'I build interfaces that feel',
    accent: 'inevitable once used',
    tail: '— and invisible while you use them.',
  },
  {
    lead: `${spellCapitalised(years)} years shipping React, Next.js and React Native across`,
    accent: 'enterprise platforms and zero-to-one products',
    tail: ', most of it under real production load.',
  },
  {
    lead: 'The studio exists to do that work',
    accent: 'without the layer of people',
    tail: 'that usually sits between the decision and the deploy.',
  },
];

export interface CareerEntry {
  index: string;
  period: string;
  role: string;
  org: string;
  location: string;
  summary: string;
  highlights: string[];
  stack: string[];
}

/** Professional record — delivered inside these organisations, not as the studio. */
export const career: CareerEntry[] = [
  {
    index: '01',
    period: '2023 — present',
    role: 'Senior Frontend Engineer',
    org: 'Ernst & Young',
    location: 'Remote · Toronto',
    summary:
      'Lead frontend on EY’s enterprise agentic AI platform — a chat-based environment used by clients globally for automated risk analysis, report generation and decision support.',
    highlights: [
      'Multi-tenant architecture with role-based access across client organisations',
      'Next.js and React Query over Python microservices on Azure',
      'Improved data retrieval performance by 40%',
    ],
    stack: ['Next.js', 'TypeScript', 'React Query', 'Azure', 'Python'],
  },
  {
    index: '02',
    period: '2022 — 2023',
    role: 'React Native Engineer',
    org: 'Shop-Ware',
    location: 'Remote',
    summary:
      'Took the customer-facing mobile product from zero to one across iOS and Android, through to a successful acquisition of the company.',
    highlights: [
      'Shipped both platforms from an empty repository',
      'Cut load times by 20%',
      'Product contributed to the acquisition',
    ],
    stack: ['React Native', 'TypeScript', 'iOS', 'Android', 'CI/CD'],
  },
  {
    index: '03',
    period: '2021 — 2022',
    role: 'Software Engineer',
    org: 'Nuvalence',
    location: 'Remote',
    summary:
      'Frontend architecture for Ford’s Connected Vehicle platform, and the modernisation of a Spring Boot system serving New York City government.',
    highlights: [
      'Connected-vehicle interfaces against realtime telemetry',
      'Legacy modernisation without a delivery freeze',
    ],
    stack: ['React', 'TypeScript', 'Java', 'Spring Boot'],
  },
  {
    index: '04',
    period: '2018 — 2021',
    role: 'UI/UX Software Developer',
    org: 'Mitel',
    location: 'Kanata, Ontario',
    summary:
      'Modernised the communication suite interface and built the component library behind it — one system driving desktop, web and mobile.',
    highlights: [
      'Reusable component library adopted across three platforms',
      'React Native and Angular in the same product surface',
    ],
    stack: ['React Native', 'Angular', 'TypeScript', 'Design systems'],
  },
  {
    index: '05',
    period: '2018',
    role: 'A.A.S. Software Engineering',
    org: 'Centennial College',
    location: 'Toronto, Ontario',
    summary: 'Associate in Applied Science, software engineering technician.',
    highlights: [],
    stack: [],
  },
];

/** Things built outside client hours — the studio's visual language started here. */
export const sideWork: {
  title: string;
  role: string;
  year: string;
  description: string;
  href: string | null;
  stack: string[];
}[] = [
  {
    title: 'Seventeen Studios',
    role: 'Founder · Principal Engineer',
    year: `${foundedYear()} →`,
    description:
      'This site. Custom GLSL hero, curtain page transitions, drag-driven galleries and generative artwork — the studio’s standard, applied to the studio.',
    href: 'https://github.com/Rutvik17/seventeen-studios',
    stack: ['Next.js', 'TypeScript', 'GSAP', 'Three.js', 'Lenis'],
  },
];

export const founderStack: { group: string; items: string[] }[] = [
  { group: 'Interface', items: ['React', 'Next.js', 'React Native', 'TypeScript'] },
  { group: 'Motion & GPU', items: ['GSAP', 'Three.js', 'GLSL', 'Lenis', 'Canvas'] },
  { group: 'Services', items: ['Node.js', 'Python', 'Java', 'PostgreSQL', 'Supabase'] },
  { group: 'Platform', items: ['AWS', 'Azure', 'Terraform', 'CI/CD'] },
];

export const founderStats: { label: string; value: string; suffix?: string; note: string }[] = [
  { label: 'Years shipping', value: String(years), suffix: '+', note: 'In production, under load' },
  { label: 'Platforms', value: '3', note: 'Web · iOS · Android' },
  { label: 'Zero-to-one products', value: '2', note: 'One through to acquisition' },
  { label: 'Studio bench', value: '5', note: 'Hard cap, senior only' },
];

/** Marquee band on the founder page. */
export const founderMarquee = [
  'React',
  'Next.js',
  'TypeScript',
  'React Native',
  'GSAP',
  'Three.js',
  'GLSL',
  'Node',
  'Python',
  'PostgreSQL',
  'Azure',
  'AWS',
] as const;
