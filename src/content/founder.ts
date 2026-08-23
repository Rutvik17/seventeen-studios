/**
 * Rutvik, as data.
 *
 * This file is the factual record only: who he is, and where he has worked.
 * It survived the founder page being torn down on purpose — the page was an
 * implementation of this data, not the data itself, and retyping a career is
 * not something the next design should have to do.
 *
 * What was removed with the page: a three-line positioning statement, a grid of
 * side work, a stack listing, a row of counters and a marquee band. All of them
 * were either written in the studio-with-clients voice the site no longer uses,
 * or described a version of this site that no longer exists. They are in git if
 * a line is ever worth recovering.
 *
 * The same employment history, phrased for an applicant tracking system rather
 * than for a page, is in `resume.ts`. Keep the two in step.
 */

import { yearsOfExperience, spell } from '@/lib/time';
import { asset } from '@/lib/asset';

const years = yearsOfExperience();

export const founder = {
  name: 'Rutvik Patel',
  initials: 'RP',
  role: 'Software Engineer',
  location: 'Toronto, Canada',
  portrait: asset('/founder/rutvik-patel.jpg'),
  portraitAlt: 'Rutvik Patel',
  resume: asset('/founder/rutvik-patel-resume.pdf'),
  resumeDocx: asset('/founder/rutvik-patel-resume.docx'),
  github: 'https://github.com/Rutvik17',
  /** One line. Used for the page's metadata, so it has to stand alone. */
  summary: `Software engineer with ${spell(years)} years building interfaces and platforms at enterprise scale — agentic AI at Ernst & Young, a mobile product taken from zero to acquisition, connected-vehicle infrastructure at Ford.`,
} as const;

/**
 * Chrome for the rebuilt founder page.
 *
 * The assembly itself has almost no copy — same rule as the landing. These
 * strings are the frame around it, and the labels on the employment record
 * underneath. The 3D scene and the working column do the rest.
 */
export const founderPage = {
  eyebrow: 'Software engineer — Toronto',
  wordmarkTop: 'RUTVIK',
  wordmarkBottom: 'PATEL',
  /**
   * What the demonstration cannot say: that the object on this page is the
   * same device the landing draws in SVG. Everything else is on screen.
   */
  line: 'The landing draws this board. This page builds it.',
  cue: 'Scroll to assemble it',
  recordLabel: 'Record',
  /**
   * The panel's bitmap font has no ampersand. EY is the name the firm actually
   * trades under, so it is what the firmware would print.
   */
  panelEmployer: 'EY',
  panelSymbol: 'NVDA',
} as const;

export interface CareerEntry {
  index: string;
  /** Literal, because it is a fact about when something happened. */
  period: string;
  role: string;
  org: string;
  location: string;
  summary: string;
  highlights: string[];
  stack: string[];
}

/** The employment record. Every date and figure on it is real. */
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
