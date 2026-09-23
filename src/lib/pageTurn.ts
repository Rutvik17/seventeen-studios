'use client';

/**
 * A sheet of paper turning over the page, and turning away again.
 *
 * Every change of page on the site is a page turn: the first visit ends with
 * the loading sheet turning away, and following a link turns a fresh sheet
 * over the current page, draws the mark on it while the next route mounts, and
 * turns it away onto the new one. It is the sketchbook's one transition, used
 * everywhere, so moving around the site feels like leafing through one book.
 *
 * ---
 *
 * HOW
 *
 * A full-screen sheet clipped by a four-point polygon whose leading edge is the
 * fold. The edge leans — the top corner leads the bottom — by an amount that
 * peaks halfway, which is the curl a real page has while it is in the air.
 * Beside the fold, a narrow gradient strip is the underside of the page and
 * the shadow it throws.
 *
 * Clip-path rather than a 3D rotation: a `rotateY` page needs a backface, a
 * perspective container and a second element for the reverse, and it still
 * reads as a card flipping rather than paper bending.
 */

import { gsap } from '@/lib/gsap';

type Parts = { sheet: HTMLElement; edge: HTMLElement };

/** Lean of the fold at the halfway point, as a share of the viewport width. */
const CURL = 0.05;

function lean(u: number) {
  return Math.sin(Math.PI * u) * CURL * 100;
}

/** The fold's angle for a lean of `c` percent, so the strip lies along it. */
function slant(c: number) {
  const run = ((2 * c) / 100) * window.innerWidth;
  return (Math.atan2(run, window.innerHeight) * 180) / Math.PI;
}

/**
 * `covering`: the sheet occupies everything RIGHT of the fold, and the fold
 * travels from the right edge to the left — a page laid down over the old one.
 */
function setCovering({ sheet, edge }: Parts, u: number) {
  const f = 100 * (1 - u);
  const c = lean(u);
  sheet.style.clipPath = `polygon(${f + c}% 0, 101% 0, 101% 100%, ${f - c}% 100%)`;
  edge.style.transform = `translateX(${f}vw) skewX(${-slant(c)}deg)`;
  edge.style.opacity = u > 0 && u < 1 ? '1' : '0';
}

/**
 * `leaving`: the sheet occupies everything LEFT of the fold, and the fold
 * travels right to left — the page lifting away and revealing what is under it.
 */
function setLeaving({ sheet, edge }: Parts, u: number) {
  const f = 100 * (1 - u);
  const c = lean(u);
  sheet.style.clipPath = `polygon(-1% 0, ${f + c}% 0, ${f - c}% 100%, -1% 100%)`;
  edge.style.transform = `translateX(${f}vw) skewX(${-slant(c)}deg)`;
  edge.style.opacity = u > 0 && u < 1 ? '1' : '0';
}

export function turnOver(parts: Parts, duration = 0.7) {
  const state = { u: 0 };
  setCovering(parts, 0);
  return gsap.to(state, {
    u: 1,
    duration,
    ease: 'power2.inOut',
    onUpdate: () => setCovering(parts, state.u),
  });
}

export function turnAway(parts: Parts, duration = 0.85) {
  const state = { u: 0 };
  setLeaving(parts, 0);
  return gsap.to(state, {
    u: 1,
    duration,
    ease: 'power2.inOut',
    onUpdate: () => setLeaving(parts, state.u),
    onComplete: () => {
      parts.sheet.style.clipPath = 'polygon(0 0, 0 0, 0 100%, 0 100%)';
      parts.edge.style.opacity = '0';
    },
  });
}
