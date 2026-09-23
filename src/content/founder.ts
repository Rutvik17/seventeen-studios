/**
 * Rutvik, as data — and the founder page's story.
 *
 * The founder page is the sketchbook itself: a cover, a prologue, a chapter for
 * each stretch of the career, and the résumé kept in a pocket inside the back
 * cover. It is written in the first person. Titles and dates are read from
 * `resume.ts`; every other fact — the measured outcomes, what each role
 * involved — is the résumé's own, and where a chapter quotes a number, the
 * résumé states it. Nothing here is invented.
 */

import { asset } from '@/lib/asset';
import { resumeEducation, resumeExperience } from './resume';
import type { DrawingId } from '@/lib/sketchbook/chapters';

export const founder = {
  name: 'Rutvik Patel',
  role: 'Software Engineer',
  location: 'Toronto, Canada',
  /*
    What the founder page's cover and the EY chapter read. Not `role`: that is
    the site's own sentence-case description of him; this is his title where
    he works.

    THE EMPLOYER IS "EY", NOT "ERNST & YOUNG"
    The firm rebranded in 2013. "EY" is not an abbreviation of the current name,
    it IS the current name — the one on their letterhead and on ey.com — and
    "Ernst & Young" is the older legal entity. The résumé's company header
    carries the long form, which is where a reader meets the name cold; this is
    the short form after first reference.
  */
  title: 'Senior Software Engineer',
  employer: 'EY',
  /** What the work is, in a phrase — for link previews and the site's description. */
  focus: 'building agentic AI platforms',
} as const;

/** The year of the first role, from the résumé's timeline. */
export const careerStart = resumeExperience[resumeExperience.length - 1].start.slice(3);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "11/2023" → "Nov 2023"; "Present" → "now". */
function month(value: string): string {
  const m = /^(\d{2})\/(\d{4})$/.exec(value);
  return m ? `${MONTHS[Number(m[1]) - 1]} ${m[2]}` : value === 'Present' ? 'now' : value;
}

/** The line under a chapter heading, built from the résumé so the two cannot disagree. */
function meta(company: string, title?: string, employer?: string): string {
  const r = resumeExperience.find((e) => e.company === company);
  if (!r) return '';
  return `${title ?? r.role} · ${employer ?? r.company} · ${month(r.start)} – ${month(r.end)}`;
}

/** The year a role began, for the page tabs and the turn labels. */
function year(company: string): string {
  const r = resumeExperience.find((e) => e.company === company);
  return r ? r.start.slice(3) : '';
}

export type BookScene =
  | { kind: 'cover' }
  | { kind: 'portrait' }
  | { kind: 'story'; from: number; to: number }
  | { kind: 'sketch'; drawing: DrawingId };

export type BookPage = {
  id: string;
  /** The tab down the book's edge. */
  tab: string;
  kicker: string;
  title: string;
  body: string;
  meta?: string;
  scene: BookScene;
  /** What the page corner says: where the next turn goes. */
  next: string;
  links?: { label: string; href: string }[];
  pocket?: boolean;
};

const city = founder.location.split(',')[0];

export const book: BookPage[] = [
  {
    id: 'cover',
    tab: 'Cover',
    kicker: 'Sketchbook No. 17',
    title: founder.name,
    body: `${city}-based ${founder.title} at ${founder.employer}. My journey, one page at a time.`,
    scene: { kind: 'cover' },
    next: 'Open it',
  },
  {
    id: 'prologue',
    tab: 'Hello',
    kicker: 'First page',
    title: 'Hi, I’m Rutvik.',
    body: 'I’m a full-stack software engineer and a forward-deployed AI engineer, building agentic AI platforms. I studied software engineering in Toronto, and the pages that follow cover each role since.',
    meta: `${resumeEducation.credential.replace(/^Associate in Applied Science \(A\.A\.S\.\), /, '')} · ${resumeEducation.school} · ${month(resumeEducation.date)}`,
    scene: { kind: 'portrait' },
    next: `Kanata, ${year('Mitel')}`,
  },
  {
    id: 'mitel',
    tab: year('Mitel'),
    kicker: `Kanata, ${year('Mitel')}`,
    title: 'Three screens, one set of parts.',
    body: 'My first job was on Mitel’s communications suite: desktop, web and phone, each built on its own. I made one component library for all three. There was a quarter less duplicated code, and people used the refreshed interface 40% more.',
    meta: meta('Mitel'),
    scene: { kind: 'sketch', drawing: 'mitel' },
    next: `Consulting, ${year('Nuvalence')}`,
  },
  {
    id: 'nuvalence',
    tab: year('Nuvalence'),
    kicker: `Consulting, ${year('Nuvalence')}`,
    title: 'Ford, and New York City.',
    body: 'At Nuvalence I worked on two client engagements. For Ford, I delivered the frontend architecture of the Connected Vehicle platform in React and Redux over Java microservices, improving user flows and page performance by 30%. For New York City, on a government web system that reduced manual processing by 40%, I led the migration to Thymeleaf and supported the project’s move to Spring Boot 3.0.',
    meta: meta('Nuvalence'),
    scene: { kind: 'sketch', drawing: 'nuvalence' },
    next: `Shop-Ware, ${year('Shop-Ware')}`,
  },
  {
    id: 'shopware',
    tab: year('Shop-Ware'),
    kicker: `Shop-Ware, ${year('Shop-Ware')}`,
    title: 'From the first commit to an acquisition.',
    body: 'I was Shop-Ware’s first mobile engineer. I built their React Native app from scratch, for iOS and Android, made it load 20% faster, and set up how it shipped. The product was part of what the company was acquired for.',
    meta: meta('Shop-Ware'),
    scene: { kind: 'sketch', drawing: 'shopware' },
    next: `EY, ${year('Ernst & Young')}`,
  },
  {
    id: 'ey',
    tab: year('Ernst & Young'),
    kicker: `EY, ${year('Ernst & Young')} to now`,
    title: 'Agentic AI, at enterprise scale.',
    body: 'I work on an agentic AI platform that global enterprises use for risk analysis, reporting and decision support. I architected its multi-tenant Next.js interface over Python microservices on Azure, improving data-retrieval performance by 40%, and took its LLM-powered authoring features from prototype to production. I also drive its design system and frontend standards, and lead code review.',
    meta: meta('Ernst & Young', founder.title, founder.employer),
    scene: { kind: 'story', from: 9.4, to: 20.0 },
    next: 'Now',
  },
  {
    id: 'studio',
    tab: 'Now',
    kicker: 'Now',
    title: 'The rest of this book.',
    body: 'From here on, I’m documenting my journey as I learn something new every day. The notebook is where it gets written down.',
    scene: { kind: 'sketch', drawing: 'studio' },
    next: 'The back pocket',
    links: [
      { label: 'Grasp', href: '/grasp/' },
      { label: 'Notebook', href: '/notebook/' },
    ],
  },
  {
    id: 'pocket',
    tab: 'Pocket',
    kicker: 'The back pocket',
    title: 'Take a copy.',
    body: 'Every job and every date, on two sheets. Or skip the paperwork and write to me.',
    scene: { kind: 'sketch', drawing: 'pocket' },
    next: 'Close the book',
    pocket: true,
  },
];

export const founderPage = {
  /** What the canvas shows, for anyone who cannot see it. */
  description:
    'A sketchbook. Its cover opens onto a pencil-and-coloured-pencil portrait of Rutvik, drawing itself; the chapters that follow draw three screens sharing one component library, a Ford F-150 Raptor on the Brooklyn waterfront with the Brooklyn Bridge and Lower Manhattan behind it, a phone running a repair-shop inspection beside a car up on a lift, stamped "acquired", a swarm of scribbles breaking a drawing apart and the pieces coming back as a bridge, the 17 mark, and a pocket holding the résumé.',
  /** The photograph the first page's portrait is drawn from, in the browser. */
  portrait: asset('/founder/rutvik-patel.jpg'),
  back: 'back',
  turnHint: 'Turn with the corner, the arrow keys, or a swipe',
  contact: 'Write to me',
  downloads: [
    {
      format: 'PDF',
      note: 'To read, print or forward',
      href: asset('/founder/rutvik-patel-resume.pdf'),
      file: 'public/founder/rutvik-patel-resume.pdf',
    },
    {
      format: 'DOCX',
      note: 'For applicant tracking systems',
      href: asset('/founder/rutvik-patel-resume.docx'),
      file: 'public/founder/rutvik-patel-resume.docx',
    },
  ],
} as const;
