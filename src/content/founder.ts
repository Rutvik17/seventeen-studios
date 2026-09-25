/**
 * Rutvik, as data — and the founder page's film.
 *
 * The founder page is a film, painted like the landing's: Rutvik sketched
 * from his photograph and washed in watercolour, and then a story told the
 * same way, scene by scene — the 0s and 1s underneath everything, and the
 * GPU that AI runs on.
 * This file is its script: what each scene is called and what is written
 * under it. The drawings are `lib/founder/scenes.ts`; every number in the
 * captions is computed by `lib/founder/facts.ts`.
 *
 * Facts about Rutvik — title, employer, what he works on — are the résumé's
 * own (`resume.ts`, and the documents in `public/founder`). Nothing here is
 * invented.
 */

import { asset } from '@/lib/asset';
import { resumeExperience } from './resume';
import { CPU_CORES, race, SMS, typed, WARP } from '@/lib/founder/facts';

export const founder = {
  name: 'Rutvik Patel',
  role: 'Software Engineer',
  location: 'Toronto, Canada',
  /*
    His title where he works. THE EMPLOYER IS "EY", NOT "ERNST & YOUNG": the
    firm rebranded in 2013, and "EY" is its name. The résumé's company header
    carries the long form.
  */
  title: 'Senior Software Engineer',
  employer: 'EY',
  /** What the work is, in a phrase — for link previews and the site's description. */
  focus: 'building agentic AI platforms',
} as const;

/** The year of the first role, from the résumé's timeline. */
export const careerStart = resumeExperience[resumeExperience.length - 1].start.slice(3);

export type SceneId = 'portrait' | 'binary' | 'gpu' | 'return';

export interface Scene {
  id: SceneId;
  /** The label in the strip of scenes along the bottom. */
  strip: string;
  /** Written large, as a caption is. */
  title: string;
  /** Written under it, one line at a time. */
  lines: string[];
  /** Seconds the finished painting holds, alive, before the next begins. */
  hold: number;
}

const firstKey = typed().find((c) => c.ch !== ' ')!;
const rc = race();

export const scenes: Scene[] = [
  {
    id: 'portrait',
    strip: 'Rutvik',
    title: founder.name,
    lines: [`${founder.title}, ${founder.employer}.`, 'This is how the things I build actually work — from the bottom.'],
    hold: 7,
  },
  {
    id: 'binary',
    strip: '0 and 1',
    title: 'It is all 0s and 1s.',
    lines: [
      'Every line of code I write, every word on this page, every image — underneath, a computer only ever holds two things: 0 and 1.',
      `Each character typed is stored as a number, and the number as eight 0s and 1s: '${firstKey.ch}' is ${firstKey.code}, ${firstKey.bits.join('')}.`,
    ],
    hold: 14,
  },
  {
    id: 'gpu',
    strip: 'the GPU',
    title: 'The GPU: thousands of small cores.',
    lines: [
      'A graphics processor trades a few clever cores for thousands of simple ones, grouped into blocks NVIDIA calls streaming multiprocessors.',
      `A kernel is one function, written in CUDA C++, run by every thread at once; each thread works out its own index i and adds one pair. Threads run in teams of ${WARP} called a warp: one instruction, ${WARP} pieces of data.`,
      `In this sketch, ${SMS} × ${WARP} = ${rc.elements} additions happen in ${rc.gpuSteps} step; ${CPU_CORES} CPU cores, four at a time, need ${rc.cpuSteps}. Built to colour millions of pixels at once, the same sums turned out to be what AI needs.`,
    ],
    hold: 15,
  },
  {
    id: 'return',
    strip: 'now',
    title: founder.name,
    lines: [`${founder.title} at ${founder.employer}, and now an AI engineer — from the 0s and 1s up.`],
    hold: 14,
  },
];

/**
 * A photograph of Rutvik to paint from, with where his face (and, if they are
 * in the picture, his hands) are, as fractions of the photograph's width and
 * height — the painter works those finest.
 */
export interface FounderPhoto {
  id: string;
  src: string;
  /** Width ÷ height. */
  aspect: number;
  /** Where he is and what is around him, for anyone who cannot see the canvas. */
  alt: string;
  face: Box;
  hands?: Box;
  /** Whether the lights in the picture twinkle once it is painted. */
  lights?: boolean;
  /** The part of the photograph to paint, when he is small in it. */
  crop?: Box;
}
type Box = { u: number; v: number; w: number; h: number };

const photos: FounderPhoto[] = [
  { id: 'temple', src: asset('/founder/rutvik-temple.jpg'), aspect: 1080 / 1440, alt: 'at a temple at night, lotus lamps on the water behind him', face: { u: 0.38, v: 0.35, w: 0.25, h: 0.24 }, hands: { u: 0.39, v: 0.72, w: 0.15, h: 0.21 }, lights: true },
  { id: 'wall-street', src: asset('/founder/rutvik-wall-street.jpg'), aspect: 1080 / 1440, alt: 'beside the Charging Bull on Wall Street, in winter', face: { u: 0.31, v: 0.32, w: 0.11, h: 0.1 }, crop: { u: 0, v: 0.2, w: 1, h: 0.8 } },
  { id: 'piccadilly', src: asset('/founder/rutvik-piccadilly.jpg'), aspect: 1080 / 1440, alt: 'at Piccadilly Circus, a red double-decker bus passing', face: { u: 0.49, v: 0.41, w: 0.13, h: 0.13 } },
  { id: 'backyard', src: asset('/founder/rutvik-backyard.jpg'), aspect: 1080 / 1440, alt: 'in a garden under a summer sky, in a striped shirt', face: { u: 0.36, v: 0.385, w: 0.12, h: 0.1 }, crop: { u: 0.05, v: 0.25, w: 0.8, h: 0.75 } },
  { id: 'evening', src: asset('/founder/rutvik-evening.jpg'), aspect: 1080 / 1440, alt: 'smiling, in a pink shirt, at night', face: { u: 0.4, v: 0.2, w: 0.22, h: 0.19 } },
  { id: 'fireworks', src: asset('/founder/rutvik-fireworks.jpg'), aspect: 1080 / 1440, alt: 'at a temple festival at night, fireworks bursting overhead', face: { u: 0.51, v: 0.635, w: 0.175, h: 0.165 }, lights: true },
  { id: 'banff', src: asset('/founder/rutvik-banff.jpg'), aspect: 1440 / 1080, alt: 'arms wide on a lookout above Banff, the Rockies behind him', face: { u: 0.445, v: 0.265, w: 0.055, h: 0.095 }, crop: { u: 0.15, v: 0.05, w: 0.7, h: 0.95 } },
  { id: 'brooklyn', src: asset('/founder/rutvik-brooklyn.jpg'), aspect: 1080 / 1440, alt: 'in a tuxedo on the Brooklyn Bridge, Lower Manhattan lit up behind him', face: { u: 0.475, v: 0.622, w: 0.055, h: 0.052 }, lights: true, crop: { u: 0.15, v: 0.38, w: 0.7, h: 0.62 } },
  { id: 'las-vegas', src: asset('/founder/rutvik-las-vegas.jpg'), aspect: 1080 / 1440, alt: 'beside a lit Christmas tree in Las Vegas, the Eiffel Tower replica behind him', face: { u: 0.465, v: 0.567, w: 0.062, h: 0.055 }, lights: true, crop: { u: 0.2, v: 0.35, w: 0.7, h: 0.65 } },
  { id: 'lake-louise', src: asset('/founder/rutvik-lake-louise.jpg'), aspect: 1080 / 1440, alt: 'on frozen Lake Louise, a snowy mountain behind him', face: { u: 0.525, v: 0.392, w: 0.07, h: 0.063 }, crop: { u: 0.15, v: 0.1, w: 0.8, h: 0.85 } },
  { id: 'suit', src: asset('/founder/rutvik-suit.jpg'), aspect: 1080 / 1920, alt: 'in a navy suit, a mirror portrait', face: { u: 0.355, v: 0.32, w: 0.205, h: 0.14 }, hands: { u: 0.43, v: 0.55, w: 0.21, h: 0.15 } },
];

export const founderFilm = {
  /** What the canvas shows, for anyone who cannot see it. */
  description: `A watercolour film: ${founder.name}, sketched from a photograph of him and painted in, then a line of code typed and stored as 0s and 1s, and a GPU running thousands of threads at once — each sketched and painted in turn, and back to his portrait.`,
  /** The photographs the portrait is drawn from — one, at random, on each visit. */
  photos,
  contact: 'Write to me',
  downloads: [
    { format: 'PDF', label: 'Résumé (PDF)', href: asset('/founder/rutvik-patel-resume.pdf'), file: 'public/founder/rutvik-patel-resume.pdf' },
    { format: 'DOCX', label: 'Résumé (DOCX)', href: asset('/founder/rutvik-patel-resume.docx'), file: 'public/founder/rutvik-patel-resume.docx' },
  ],
} as const;
