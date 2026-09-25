/**
 * Rutvik, as data — and the founder page's film.
 *
 * The founder page is a film, painted like the landing's: Rutvik sketched
 * from his photograph and washed in watercolour, and then a story told the
 * same way, scene by scene — from a single switch to the AI he builds now.
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
import { byteOf, CONTEXT, descent, encodeAdd, halfAdder, LETTER, matmul, neuron, RATE, softmax, WARP } from '@/lib/founder/facts';

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

export type SceneId =
  | 'portrait'
  | 'binary'
  | 'switch'
  | 'byte'
  | 'logic'
  | 'cpu'
  | 'metal'
  | 'gpu'
  | 'matmul'
  | 'neuron'
  | 'learning'
  | 'language'
  | 'agent'
  | 'return';

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

const byte = byteOf(LETTER);
const add = halfAdder(1, 1);
const code = encodeAdd();
const mm = matmul();
const n = neuron();
const gd = descent();
const probs = softmax();

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
    lines: ['Every line of code I write, every word on this page, every image —', 'underneath, a computer only ever holds two things: 0 and 1.'],
    hold: 8,
  },
  {
    id: 'switch',
    strip: 'a switch',
    title: 'A bit is a switch.',
    lines: [
      'A transistor is a tiny switch with no moving parts. A voltage on its gate lets current through, or stops it.',
      'Current flowing means 1; no current means 0. One switch holds one bit — one yes-or-no.',
    ],
    hold: 8,
  },
  {
    id: 'byte',
    strip: 'a byte',
    title: 'Eight bits make a byte.',
    lines: [
      'Each switch in a row of eight is worth twice the one to its right: 128, 64, 32, 16, 8, 4, 2, 1.',
      `Add up the ones that are on: ${byte.on.join(' + ')} = ${byte.sum}.`,
      `And the letter ${LETTER} is stored as ${byte.code} — so these eight switches, ${byte.bits.join('')}, are an ${LETTER}.`,
    ],
    hold: 9,
  },
  {
    id: 'logic',
    strip: 'logic',
    title: 'Switches that add.',
    lines: [
      'Wire switches together and they make gates. An XOR gate outputs 1 when exactly one input is 1; an AND gate when both are.',
      `Feed both a 1 and a 1: XOR gives ${add.sum}, AND gives ${add.carry}. Read together, that is ${add.binary} — two, written in binary.`,
      'Every sum a computer does is built from gates like these.',
    ],
    hold: 9,
  },
  {
    id: 'cpu',
    strip: 'the CPU',
    title: 'The processor: fetch, decode, execute.',
    lines: [
      'A CPU is billions of these switches. On every tick of its clock it fetches an instruction from memory, decodes what it asks for, and executes it.',
      'A few big, clever cores, each doing one thing after another — billions of times a second.',
    ],
    hold: 8,
  },
  {
    id: 'metal',
    strip: 'C++',
    title: 'From C++ to the metal.',
    lines: [
      `I write a line of C++: ${code.source}`,
      `A compiler — a program that translates code — turns it into an instruction the CPU knows: ${code.assembly}.`,
      `That instruction is two bytes, ${code.hex.join(' ')}, and those bytes are switches: ${code.bits.join(' ')}.`,
    ],
    hold: 9,
  },
  {
    id: 'gpu',
    strip: 'the GPU',
    title: 'The GPU: thousands of small cores.',
    lines: [
      'A graphics processor trades a few clever cores for thousands of simple ones, grouped into streaming multiprocessors.',
      `They work in teams of ${WARP} threads called a warp: one instruction, run on ${WARP} different pieces of data at once.`,
      'Its own memory, stacked beside it, keeps them fed. It was built for pixels; it turned out to be built for AI.',
    ],
    hold: 10,
  },
  {
    id: 'matmul',
    strip: 'matrices',
    title: 'The one sum AI is made of.',
    lines: [
      'A matrix is a grid of numbers. Multiplying two means: each answer is one row of the first times one column of the second, added up.',
      `In symbols, c = a₁b₁ + a₂b₂. With numbers: ${mm.working[0][0]}.`,
      'Every answer is independent, so a GPU gives each one its own thread — and does them all at once.',
    ],
    hold: 10,
  },
  {
    id: 'neuron',
    strip: 'a neuron',
    title: 'A neuron: a weighted vote.',
    lines: [
      'An artificial neuron multiplies each input by a weight — how much it matters — adds them up with a bias, and squashes the total between 0 and 1.',
      `In symbols, z = x₁w₁ + x₂w₂ + x₃w₃ + b. With numbers: ${n.working}.`,
      `Squashed by the sigmoid curve, 1 ÷ (1 + e⁻ᶻ), that is ${n.y}. A network is millions of these, and it is all matrix multiplication.`,
    ],
    hold: 10,
  },
  {
    id: 'learning',
    strip: 'learning',
    title: 'Learning is rolling downhill.',
    lines: [
      'The loss measures how wrong the network is. Its slope says which way is downhill.',
      `Each step moves the weight a little against the slope: new w = w − rate × slope. With rate ${RATE}: ${gd.first}.`,
      `Step after step — ${gd.steps.map((s) => s.w).join(', ')} — the weight settles where the loss is smallest.`,
    ],
    hold: 10,
  },
  {
    id: 'language',
    strip: 'language',
    title: 'A language model guesses the next word.',
    lines: [
      `Text is cut into tokens. Given “${CONTEXT.join(' ')}”, attention lets each word weigh every word before it.`,
      'The model scores every word it knows; the softmax turns scores into probabilities: e to the power of each score, divided by the sum of them all.',
      `Here: ${probs.map((p) => `${p.word} ${p.percent}%`).join(', ')}. It writes “${probs[0].word}”, and does it again.`,
    ],
    hold: 10,
  },
  {
    id: 'agent',
    strip: 'agents',
    title: 'An agent: a model in a loop.',
    lines: [
      'Give a model tools — search, code, a database — and a goal, and let it loop: plan, act, look at what happened, try again.',
      `That is what I build now at ${founder.employer}: agentic AI platforms, used by global enterprises for risk analysis, reporting and decision support.`,
    ],
    hold: 10,
  },
  {
    id: 'return',
    strip: 'now',
    title: founder.name,
    lines: [`${founder.title} at ${founder.employer}, and now an AI engineer — from the switches up.`],
    hold: 14,
  },
];

export const founderFilm = {
  /** What the canvas shows, for anyone who cannot see it. */
  description: `A watercolour film: ${founder.name}, sketched from his photograph at a temple at night and painted in, then the story of how computers work — a switch, a byte, logic gates, a processor, C++ compiled to machine code, a GPU, matrix multiplication, a neuron, learning, a language model and an agent — each sketched and painted in turn, and back to his portrait.`,
  /** The photograph the portrait is drawn from. */
  photo: asset('/founder/rutvik-patel.jpg'),
  contact: 'Write to me',
  downloads: [
    { format: 'PDF', label: 'Résumé (PDF)', href: asset('/founder/rutvik-patel-resume.pdf'), file: 'public/founder/rutvik-patel-resume.pdf' },
    { format: 'DOCX', label: 'Résumé (DOCX)', href: asset('/founder/rutvik-patel-resume.docx'), file: 'public/founder/rutvik-patel-resume.docx' },
  ],
} as const;
