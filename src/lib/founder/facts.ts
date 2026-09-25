/**
 * THE FILM'S ARITHMETIC — every number the founder film shows, computed.
 *
 * Nothing on screen is typed in as a result. The byte is read from the
 * letter, the sum from the gates, the machine code from the instruction's
 * encoding, the matrix product from the matrices, the neuron from its
 * weights, the descent from its slope, the probabilities from the scores.
 * The captions (`content/founder.ts`) and the drawings (`lib/founder/scenes.ts`)
 * both read them from here, so the words and the pictures cannot disagree.
 *
 * Pure functions, no DOM: the build and the share cards can import it.
 */

const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
const fmt = (v: number, d = 2) => String(round(v, d));

/* ---------------- a byte: a letter as eight switches ---------------- */

export const LETTER = 'R';

export function byteOf(ch: string) {
  const code = ch.charCodeAt(0);
  const bits = code.toString(2).padStart(8, '0').split('').map(Number);
  const places = bits.map((_, i) => 2 ** (7 - i));
  const on = places.filter((_, i) => bits[i] === 1);
  return { ch, code, bits, places, on, sum: on.reduce((a, b) => a + b, 0) };
}

/* ---------------- logic: adding two bits with two gates ---------------- */

export function halfAdder(a: 0 | 1, b: 0 | 1) {
  const sum = (a ^ b) as 0 | 1;
  const carry = (a & b) as 0 | 1;
  return { a, b, sum, carry, binary: `${carry}${sum}`, value: carry * 2 + sum };
}

/* ---------------- C++ to machine code ---------------- */

/**
 * `add eax, ebx` in x86: opcode 0x01 (ADD r/m32, r32), then a ModRM byte —
 * two bits of mode (11: both operands are registers), three for the source
 * register (ebx is register 3), three for the destination (eax is 0).
 */
export function encodeAdd() {
  const REG = { eax: 0, ecx: 1, edx: 2, ebx: 3 } as const;
  const opcode = 0x01;
  const modrm = (0b11 << 6) | (REG.ebx << 3) | REG.eax;
  const bytes = [opcode, modrm];
  return {
    source: 'int sum = a + b;',
    assembly: 'add eax, ebx',
    bytes,
    hex: bytes.map((b) => b.toString(16).toUpperCase().padStart(2, '0')),
    bits: bytes.map((b) => b.toString(2).padStart(8, '0')),
  };
}

/* ---------------- matrix multiplication ---------------- */

export const MAT_A = [
  [1, 2],
  [3, 4],
];
export const MAT_B = [
  [5, 6],
  [7, 8],
];

export function matmul(A = MAT_A, B = MAT_B) {
  const C = A.map((row) => B[0].map((_, j) => row.reduce((s, a, k) => s + a * B[k][j], 0)));
  const working = A.map((row, i) =>
    B[0].map((_, j) => `${row.map((a, k) => `${a}×${B[k][j]}`).join(' + ')} = ${C[i][j]}`),
  );
  return { A, B, C, working };
}

/* ---------------- a neuron ---------------- */

export const NEURON = { x: [0.9, 0.2, 0.6], w: [0.8, -0.5, 0.3], b: -0.1 };

export const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

export function neuron({ x, w, b } = NEURON) {
  const products = x.map((xi, i) => xi * w[i]);
  const z = products.reduce((s, p) => s + p, 0) + b;
  const y = sigmoid(z);
  return {
    x,
    w,
    b,
    z: round(z),
    y: round(y),
    working: `${x.map((xi, i) => `${xi}×${w[i] < 0 ? `(−${Math.abs(w[i])})` : w[i]}`).join(' + ')} ${b < 0 ? '−' : '+'} ${Math.abs(b)} = ${fmt(z)}`,
  };
}

/* ---------------- learning: gradient descent ---------------- */

/** The loss: how wrong the weight w is, lowest at w = 3. */
export const TARGET = 3;
export const loss = (w: number) => (w - TARGET) ** 2;
export const slope = (w: number) => 2 * (w - TARGET);
export const RATE = 0.2;

export function descent(start = 0, steps = 6) {
  const out = [{ w: start, loss: loss(start), slope: slope(start) }];
  for (let k = 0; k < steps; k++) {
    const prev = out[out.length - 1];
    const w = round(prev.w - RATE * prev.slope, 3);
    out.push({ w, loss: round(loss(w), 3), slope: round(slope(w), 3) });
  }
  const first = out[0];
  return {
    steps: out,
    first: `${first.w} − ${RATE} × (${fmt(first.slope)}) = ${fmt(out[1].w)}`,
  };
}

/* ---------------- next-word probabilities ---------------- */

export const CONTEXT = ['The', 'cat', 'sat', 'on', 'the'];
export const CANDIDATES = [
  { word: 'mat', score: 3.2 },
  { word: 'floor', score: 2.1 },
  { word: 'roof', score: 1.0 },
  { word: 'moon', score: -0.5 },
];

export function softmax(items = CANDIDATES) {
  const exps = items.map((c) => Math.exp(c.score));
  const total = exps.reduce((a, b) => a + b, 0);
  return items.map((c, i) => ({ ...c, p: exps[i] / total, percent: Math.round((exps[i] / total) * 100) }));
}

/** How strongly the last word attends to each earlier one — illustrative scores, normalised. */
export function attention() {
  const scores = [0.4, 1.6, 1.3, 0.9, 0.2];
  const e = scores.map(Math.exp);
  const t = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / t);
}

/* ---------------- the GPU ---------------- */

/** Threads in a warp: the group of threads an NVIDIA streaming multiprocessor runs in lockstep. */
export const WARP = 32;
