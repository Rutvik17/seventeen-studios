'use client';

/**
 * The companion's OLED, in its housing.
 *
 * A 1.5" SSD1351 module — 33.8 x 40.0 mm with a 26.855 x 25.864 mm active area,
 * see `lib/oled.ts` — behind a smoked window in a milled aluminium shell.
 *
 * ---
 * WHY SMOKED ACRYLIC, WHICH IS PHYSICS RATHER THAN STYLING
 *
 * An OLED pixel that is off EMITS NOTHING. Not dark grey, not "good contrast" —
 * nothing. So a dark tinted window over it makes the unlit area optically
 * identical to the surround: the bezel stops existing and the character appears
 * to float in a void with no edges.
 *
 * That is why good OLED products look seamless, and it is a trick the e-paper
 * beside it physically cannot do. E-paper REFLECTS, so it is only ever as light
 * as the room; put smoked acrylic over e-paper and you get a dim grey rectangle
 * with a clearly visible border. Two panels, opposite optics, opposite
 * industrial design — and the enclosure follows the physics rather than a mood
 * board.
 *
 * ---
 * WHY THE SPRITE IS AN IMAGE AND THE ANIMATION IS CSS
 *
 * The panel shows a 128 x 128 sprite and the source frames are 128 x 128, so a
 * frame lands on the panel 1:1 with no resampling — see `lib/sprites.ts`, where
 * that is checked rather than assumed.
 *
 * The strip is drawn ONCE as a single `<image>` and stepped with a CSS
 * keyframe. Nothing re-renders per frame: no React state, no timer, no
 * requestAnimationFrame. An earlier version drove a sprite clock through React
 * at 10fps, which re-rendered the entire board SVG ten times a second to move
 * one element. `steps()` hands the whole job to the compositor.
 */

import { OLED } from '@/lib/oled';
import {
  FRAME,
  FRAMES,
  HOLDS_LAST,
  animationFor,
  cycleSeconds,
  spriteSrc,
  type Character,
} from '@/lib/sprites';

export type OledModuleProps = {
  /** Top-left of the HOUSING, in board millimetres. */
  x: number;
  y: number;
  /** Where the model's reading sits in its own output distribution, 0-1. */
  percentile: number;
  /** Which character the model's reasoning puts on the panel. */
  character: Character;
  /** Honour the visitor's motion preference: hold a single frame. */
  reduced?: boolean;
};

/*
  The housing, in millimetres.

  The module is 33.8 x 40.0. A machined shell needs a wall — 2 mm of aluminium
  is the thinnest that is sensibly millable and still stiff — so the outside is
  the module plus 2 mm on each side.
*/
const WALL = 2;
export const OLED_HOUSING = {
  width: OLED.moduleWidth + WALL * 2,
  height: OLED.moduleHeight + WALL * 2,
};

/*
  The window is larger than the active area on purpose.

  If the smoked panel were cut to the pixels, its edge would land exactly where
  the image ends and you would see a frame — which is the one thing this
  construction exists to avoid. Oversizing it means the boundary falls on dead
  black in every direction, so there is no visible edge to find.
*/
const WINDOW_MARGIN = 3.0;

export function OledModule({ x, y, percentile, character, reduced = false }: OledModuleProps) {
  const w = OLED_HOUSING.width;
  const h = OLED_HOUSING.height;

  const windowX = x + WALL - 0.6;
  const windowY = y + WALL - 0.6;
  const windowW = OLED.moduleWidth + 1.2;
  const windowH = OLED.moduleHeight + 1.2;

  /*
    The active area sits high in the module, not centred: the driver IC and the
    FPC tail live along the bottom edge, which is why a 26 mm image sits in a
    40 mm part. Centring it would be the tell that nobody has held one.
  */
  const activeX = x + WALL + (OLED.moduleWidth - OLED.mmWidth) / 2;
  const activeY = y + WALL + WINDOW_MARGIN;

  /*
    Millimetres per source pixel. Deliberately different on each axis: the
    active area is 26.855 x 25.864 mm over a square 128 x 128 grid, so this
    panel's pixels really are 3.8% wider than they are tall. Forcing them square
    would be prettier and wrong.
  */
  const cellX = OLED.mmWidth / FRAME;
  const cellY = OLED.mmHeight / FRAME;

  const animation = animationFor(percentile);
  const frames = FRAMES[character][animation];
  const holds = HOLDS_LAST.has(animation);

  const stripWidth = frames * FRAME * cellX;
  const travel = (holds ? frames - 1 : frames) * FRAME * cellX;
  const steps = Math.max(1, holds ? frames - 1 : frames);
  const duration = cycleSeconds(character, animation);

  // Keyed by what it draws, so a mood change replaces the keyframe rather than
  // animating the new strip against the old one's travel distance.
  const anim = `oled-${character}-${animation}`;

  return (
    <g>
      <defs>
        {/* Brushed aluminium: a shallow diagonal ramp, not a chrome gradient. */}
        <linearGradient id="oled-shell" x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#9aa0a6" />
          <stop offset="38%" stopColor="#7e858c" />
          <stop offset="62%" stopColor="#6d747b" />
          <stop offset="100%" stopColor="#565c63" />
        </linearGradient>
        {/* The chamfer catches light along the top-left only. */}
        <linearGradient id="oled-chamfer" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c8ced4" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#c8ced4" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#2e3338" stopOpacity="0.55" />
        </linearGradient>
        {/*
          The smoked window. Nearly black, faintly cool, with a single specular
          sweep — acrylic is glossy and a perfectly matte dark rectangle reads as
          a hole rather than as a cover.
        */}
        <linearGradient id="oled-glass" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#20242b" />
          <stop offset="30%" stopColor="#14171c" />
          <stop offset="100%" stopColor="#0b0d10" />
        </linearGradient>
        <linearGradient id="oled-specular" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.10" />
          <stop offset="26%" stopColor="#ffffff" stopOpacity="0.02" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        {/*
          Bloom. A lit emitter behind acrylic scatters into its neighbours, which
          is why a photograph of an OLED never has perfectly hard pixel edges.
          Taken from the image itself rather than tinted by a prop — the spill
          is the panel's own light, so it is whatever the panel is showing.
        */}
        <filter id="oled-bloom" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="0.28" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* The pixels the panel actually has. Everything outside is dead glass. */}
        <clipPath id="oled-active">
          <rect x={activeX} y={activeY} width={OLED.mmWidth} height={OLED.mmHeight} />
        </clipPath>
      </defs>

      <style>{`
        @keyframes ${anim} { to { transform: translateX(-${travel.toFixed(4)}px); } }
        .oled-strip-${character}-${animation} {
          animation: ${anim} ${duration.toFixed(3)}s steps(${steps}) infinite;
          ${holds ? 'animation-iteration-count: 1; animation-fill-mode: forwards;' : ''}
        }
        @media (prefers-reduced-motion: reduce) {
          .oled-strip-${character}-${animation} { animation: none; }
        }
      `}</style>

      {/* Shell, with a soft contact shadow so it sits ON the board. */}
      <rect x={x + 0.4} y={y + 0.7} width={w} height={h} rx={2.6} fill="#000" opacity="0.18" />
      <rect x={x} y={y} width={w} height={h} rx={2.6} fill="url(#oled-shell)" />
      <rect
        x={x + 0.35}
        y={y + 0.35}
        width={w - 0.7}
        height={h - 0.7}
        rx={2.3}
        fill="none"
        stroke="url(#oled-chamfer)"
        strokeWidth={0.7}
      />

      {/* Smoked cover. */}
      <rect x={windowX} y={windowY} width={windowW} height={windowH} rx={1.4} fill="url(#oled-glass)" />

      {/*
        The image. One element for the whole strip, clipped to the active area
        and stepped sideways — so exactly one frame is ever visible, and moving
        between frames costs a compositor transform rather than a repaint.
      */}
      <g clipPath="url(#oled-active)" filter="url(#oled-bloom)">
        <g className={reduced ? undefined : `oled-strip-${character}-${animation}`}>
          <image
            href={spriteSrc(character, animation)}
            x={activeX}
            y={activeY}
            width={stripWidth}
            height={OLED.mmHeight}
            preserveAspectRatio="none"
            style={{ imageRendering: 'pixelated' }}
          />
        </g>
      </g>

      {/* Specular sweep last, so it lies over the emitters like real glass. */}
      <rect
        x={windowX}
        y={windowY}
        width={windowW}
        height={windowH * 0.55}
        rx={1.4}
        fill="url(#oled-specular)"
        pointerEvents="none"
      />

      {/* Two M2 socket heads on the diagonal — enough to locate a shell this size. */}
      {[
        [x + 1.15, y + 1.15],
        [x + w - 1.15, y + h - 1.15],
      ].map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r={0.62} fill="#4a5057" />
          <circle cx={cx} cy={cy} r={0.34} fill="#2b3036" />
        </g>
      ))}
    </g>
  );
}
