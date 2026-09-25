/**
 * THE FILM'S ARITHMETIC — every number the founder film shows, computed.
 *
 * Nothing on screen is typed in as a result. Each character's byte is read
 * from the character; the GPU's thread indices and its race against the CPU
 * are worked out from the sizes of the chips as drawn. The captions
 * (`content/founder.ts`) and the drawings (`lib/founder/scenes.ts`) both read
 * them from here, so the words and the pictures cannot disagree.
 *
 * Pure functions, no DOM: the build and the share cards can import it.
 */

/* ---------------- a character as eight switches ---------------- */

export function byteOf(ch: string) {
  const code = ch.charCodeAt(0);
  const bits = code.toString(2).padStart(8, '0').split('').map(Number);
  const places = bits.map((_, i) => 2 ** (7 - i));
  const on = places.filter((_, i) => bits[i] === 1);
  return { ch, code, bits, places, on, sum: on.reduce((a, b) => a + b, 0) };
}

/* ---------------- typing: letters become bytes ---------------- */

/** The line typed on the laptop, and each of its characters as the number and the bits it is stored as (ASCII). */
export const TYPED = 'int sum = a + b;';
export function typed(line = TYPED) {
  return line.split('').map((ch) => byteOf(ch));
}

/* ---------------- the GPU ---------------- */

/** Threads in a warp: the group of threads an NVIDIA streaming multiprocessor runs in lockstep. */
export const WARP = 32;

/** The GPU drawn: 24 streaming multiprocessors, each running one warp — against a CPU's four cores. */
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
