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

/* ---------------- typing: letters become bytes ---------------- */

/** The line typed on the laptop, and each of its characters as the number and the bits it is stored as (ASCII). */
export const TYPED = 'int sum = a + b;';
export function typed(line = TYPED) {
  return line.split('').map((ch) => byteOf(ch));
}

/** Counting up to a number in binary, as the lamps do: the value and its eight bits at each count. */
export function countTo(n: number) {
  return Array.from({ length: n + 1 }, (_, v) => ({ v, bits: v.toString(2).padStart(8, '0').split('').map(Number) }));
}

/* ---------------- a half adder, every way in ---------------- */

export function truthTable() {
  return ([0, 1] as const).flatMap((a) => ([0, 1] as const).map((b) => halfAdder(a, b)));
}

/* ---------------- a processor running a program ---------------- */

/** a and b in memory, and the four instructions that add them — with what each leaves in the registers and memory. */
export const PROGRAM_DATA = { a: 2, b: 3 };
export function runProgram({ a, b } = PROGRAM_DATA) {
  const steps = [
    { text: 'LOAD R1, a', does: `copy a from memory into register R1`, R1: a as number | null, R2: null as number | null, sum: null as number | null },
    { text: 'LOAD R2, b', does: `copy b into register R2`, R1: a, R2: b, sum: null },
    { text: 'ADD R1, R2', does: `add R2 into R1`, R1: a + b, R2: b, sum: null },
    { text: 'STORE R1, sum', does: `copy R1 into memory as sum`, R1: a + b, R2: b, sum: a + b },
  ];
  return { a, b, steps };
}

/* ---------------- the x86 instruction, field by field ---------------- */

export function modrmFields() {
  const { bytes } = encodeAdd();
  const m = bytes[1];
  return {
    opcode: bytes[0].toString(2).padStart(8, '0'),
    mod: ((m >> 6) & 0b11).toString(2).padStart(2, '0'),
    reg: ((m >> 3) & 0b111).toString(2).padStart(3, '0'),
    rm: (m & 0b111).toString(2).padStart(3, '0'),
  };
}

/** What the compiler might make of `int sum = a + b;` — load both, add, store. */
export const ASSEMBLY = ['mov eax, [a]', 'mov ebx, [b]', 'add eax, ebx', 'mov [sum], eax'];

/* ---------------- the sketch's GPU against a CPU ---------------- */

/** The GPU drawn: 24 streaming multiprocessors, each running one warp. */
export const SMS = 24;
export const CPU_CORES = 4;
export function race(elements = SMS * WARP) {
  return {
    elements,
    gpuSteps: Math.ceil(elements / (SMS * WARP)),
    cpuSteps: Math.ceil(elements / CPU_CORES),
  };
}
/** The global index a CUDA thread computes: blockIdx.x × blockDim.x + threadIdx.x. */
export const threadIndex = (block: number, thread: number, blockDim = WARP) => block * blockDim + thread;

/* ---------------- an agent's loop, with a tool ---------------- */

export const TASK = { x: 17, y: 23 };
export function agentRun({ x, y } = TASK) {
  return { question: `What is ${x} × ${y}?`, call: `calculator(${x} × ${y})`, result: x * y };
}
