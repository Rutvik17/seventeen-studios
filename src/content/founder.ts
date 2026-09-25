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
import { byteOf, CANDIDATES, CONTEXT, descent, encodeAdd, halfAdder, LETTER, matmul, neuron, RATE, softmax, TARGET, WARP } from '@/lib/founder/facts';

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
      'A transistor is a switch with no moving parts. Put a voltage on its gate and a thin channel opens in the silicon beneath it, so current can flow from source to drain; take the voltage away and the channel closes.',
      'On is read as 1, off as 0. That one yes-or-no is a bit — and a chip is billions of these switches.',
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
      `In ASCII, the standard code for text, ${byte.code} means the letter ${LETTER} — so these eight switches, ${byte.bits.join('')}, are an ${LETTER}.`,
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
      'A CPU is billions of these switches, arranged into a few cores. Each core works through a program: it fetches an instruction from memory, decodes what it asks for, and executes it — then the next.',
      'A clock keeps every step in time, ticking billions of times a second. A few big, clever cores, each quick at one thing after another.',
    ],
    hold: 8,
  },
  {
    id: 'metal',
    strip: 'C++',
    title: 'From C++ to the metal.',
    lines: [
      `I write a line of C++: ${code.source}`,
      `A compiler — a program that translates code — turns it into instructions the CPU knows. The addition becomes ${code.assembly}: add the number in register ebx to the one in eax (a register is one of a few slots inside the CPU that hold a number).`,
      `An assembler encodes that as two bytes, written in hexadecimal as ${code.hex.join(' ')} — and those bytes are switches: ${code.bits.join(' ')}.`,
    ],
    hold: 9,
  },
  {
    id: 'gpu',
    strip: 'the GPU',
    title: 'The GPU: thousands of small cores.',
    lines: [
      'A graphics processor trades a few clever cores for thousands of simple ones, grouped into blocks NVIDIA calls streaming multiprocessors.',
      `A thread is one small task. They run in teams of ${WARP} called a warp: one instruction, carried out on ${WARP} different pieces of data at once.`,
      'Its own fast memory sits right beside it to keep them fed. It was built to colour millions of pixels at once; the same sums turned out to be what AI needs.',
    ],
    hold: 10,
  },
  {
    id: 'matmul',
    strip: 'matrices',
    title: 'The one sum AI is made of.',
    lines: [
      'A matrix is a grid of numbers. Multiplying two means: each answer is one row of the first times one column of the second, added up.',
      `In symbols, for a row a₁ a₂ and a column b₁ b₂: c = a₁b₁ + a₂b₂. With numbers, the top-left answer: ${mm.working[0][0]}.`,
      'Every answer is independent, so a GPU gives each one its own thread — and does them all at once.',
    ],
    hold: 10,
  },
  {
    id: 'neuron',
    strip: 'a neuron',
    title: 'A neuron: a weighted vote.',
    lines: [
      'An artificial neuron multiplies each input x by a weight w — how much that input matters — adds them up with a bias b, a fixed nudge, and squashes the total z to between 0 and 1.',
      `In symbols, z = x₁w₁ + x₂w₂ + x₃w₃ + b. With numbers: ${n.working}.`,
      `The sigmoid curve does the squashing: 1 ÷ (1 + e⁻ᶻ), where e ≈ 2.718. For z = ${n.z} that is ${n.y}. A network is layers of these, and a whole layer's sums at once are one matrix multiplication.`,
    ],
    hold: 10,
  },
  {
    id: 'learning',
    strip: 'learning',
    title: 'Learning is rolling downhill.',
    lines: [
      `The loss measures how wrong a network is. Here, for one weight w, the loss is (w − ${TARGET})², smallest at w = ${TARGET}; its slope, 2(w − ${TARGET}), says which way is downhill.`,
      `Each step moves the weight a little against the slope: new w = w − rate × slope. With rate ${RATE}, starting at 0: ${gd.first}.`,
      `Step after step — ${gd.steps.map((s) => s.w).join(', ')} — w settles toward ${TARGET}. A real network does this for millions of weights at once.`,
    ],
    hold: 10,
  },
  {
    id: 'language',
    strip: 'language',
    title: 'A language model guesses the next word.',
    lines: [
      `Text is cut into tokens — words, or pieces of words. Given “${CONTEXT.join(' ')}”, attention lets each word weigh every word up to itself.`,
      'The model then gives every word it knows a score. The softmax turns scores into probabilities: e to the power of each score, divided by the sum of them all.',
      `Say four candidates score ${CANDIDATES.map((c) => `${c.word} ${c.score}`).join(', ')}. Between them: ${probs.map((p) => `${p.word} ${p.percent}%`).join(', ')}. It picks a word — here “${probs[0].word}” — adds it, and does it all again.`,
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
}
type Box = { u: number; v: number; w: number; h: number };

const photos: FounderPhoto[] = [
  { id: 'temple', src: asset('/founder/rutvik-temple.jpg'), aspect: 1080 / 1440, alt: 'at a temple at night, lotus lamps on the water behind him', face: { u: 0.38, v: 0.35, w: 0.25, h: 0.24 }, hands: { u: 0.39, v: 0.72, w: 0.15, h: 0.21 }, lights: true },
  { id: 'wall-street', src: asset('/founder/rutvik-wall-street.jpg'), aspect: 1080 / 1440, alt: 'beside the Charging Bull on Wall Street, in winter', face: { u: 0.31, v: 0.32, w: 0.11, h: 0.1 } },
  { id: 'piccadilly', src: asset('/founder/rutvik-piccadilly.jpg'), aspect: 1080 / 1440, alt: 'at Piccadilly Circus, a red double-decker bus passing', face: { u: 0.49, v: 0.41, w: 0.13, h: 0.13 } },
  { id: 'backyard', src: asset('/founder/rutvik-backyard.jpg'), aspect: 1080 / 1440, alt: 'in a garden under a summer sky, in a striped shirt', face: { u: 0.36, v: 0.385, w: 0.12, h: 0.1 } },
  { id: 'evening', src: asset('/founder/rutvik-evening.jpg'), aspect: 1080 / 1440, alt: 'smiling, in a pink shirt, at night', face: { u: 0.4, v: 0.2, w: 0.22, h: 0.19 } },
  { id: 'suit', src: asset('/founder/rutvik-suit.jpg'), aspect: 1080 / 1920, alt: 'in a navy suit, a mirror portrait', face: { u: 0.355, v: 0.32, w: 0.205, h: 0.14 }, hands: { u: 0.43, v: 0.55, w: 0.21, h: 0.15 } },
];

export const founderFilm = {
  /** What the canvas shows, for anyone who cannot see it. */
  description: `A watercolour film: ${founder.name}, sketched from a photograph of him and painted in, then the story of how computers work — a switch, a byte, logic gates, a processor, C++ compiled to machine code, a GPU, matrix multiplication, a neuron, learning, a language model and an agent — each sketched and painted in turn, and back to his portrait.`,
  /** The photographs the portrait is drawn from — one, at random, on each visit. */
  photos,
  contact: 'Write to me',
  downloads: [
    { format: 'PDF', label: 'Résumé (PDF)', href: asset('/founder/rutvik-patel-resume.pdf'), file: 'public/founder/rutvik-patel-resume.pdf' },
    { format: 'DOCX', label: 'Résumé (DOCX)', href: asset('/founder/rutvik-patel-resume.docx'), file: 'public/founder/rutvik-patel-resume.docx' },
  ],
} as const;
