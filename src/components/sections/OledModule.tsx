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

import { useEffect, useState } from 'react';

import { OLED } from '@/lib/oled';
import {
  FRAMES,
  HOLDS_LAST,
  animationFor,
  cycleSeconds,
  spriteSrc,
  type Character,
} from '@/lib/sprites';
import {
  HORIZON,
  PALETTE,
  PANEL,
  RIDGE_MID,
  RIDGE_NEAR,
  SUN,
  fujiPath,
  petals,
  ridgePath,
  sceneFor,
  timeOfDayAt,
  type TimeOfDay,
  snowPath,
  stars,
  toriiParts,
} from '@/lib/backdrop';

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
  width: OLED.glassWidth + WALL * 2,
  height: OLED.glassHeight + WALL * 2,
};

/*
  The window is slightly larger than the glass on purpose.

  If the smoked panel were cut to the pixels, its edge would land exactly where
  the image ends and you would see a frame — which is the one thing this
  construction exists to avoid. Oversizing it means the boundary falls on dead
  black in every direction, so there is no visible edge to find.
*/

export function OledModule({ x, y, percentile, character, reduced = false }: OledModuleProps) {
  const w = OLED_HOUSING.width;
  const h = OLED_HOUSING.height;

  const windowX = x + WALL - 0.6;
  const windowY = y + WALL - 0.6;
  const windowW = OLED.glassWidth + 1.2;
  const windowH = OLED.glassHeight + 1.2;

  /*
    Centred in the GLASS, with the small bezel every panel has around its
    active area. The driver IC and the flex tail are on the carrier behind,
    which is why they take up no height here.
  */
  const activeX = x + WALL + (OLED.glassWidth - OLED.mmWidth) / 2;
  const activeY = y + WALL + (OLED.glassHeight - OLED.mmHeight) / 2;

  const animation = animationFor(percentile);

  /*
    THE SKY COMES FROM THE CLOCK, AND THE CLOCK HAS TO BE THE VIEWER'S.

    The site is a static export, so anything read from `new Date()` during
    render is frozen at BUILD time — which is the whole reason the backdrop
    never changed. It has to be read after mount, in the browser, in whatever
    timezone the person is actually in.

    `night` is the server-rendered default rather than the current hour,
    because the prerender and the first client render have to agree or React
    replaces the panel on hydration. The real hour arrives a frame later.
  */
  const [time, setTime] = useState<TimeOfDay>('night');
  useEffect(() => {
    const read = () => setTime(timeOfDayAt(new Date()));
    read();
    /* A page left open should cross into the evening on its own. */
    const id = setInterval(read, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const scene = sceneFor(time);
  const frames = FRAMES[character][animation];
  const holds = HOLDS_LAST.has(animation);

  /*
    Everything inside the panel is authored in PANEL PIXELS and drawn through a
    nested viewBox, which is what lets the backdrop and the sprite share one
    coordinate system. The nested svg is stretched to the active area with
    preserveAspectRatio="none", and that stretch is the physical truth: the
    active area is 26.855 x 25.864 mm over a square 128 x 128 grid, so this
    panel's pixels really are 3.8% wider than they are tall.
  */
  const travel = (holds ? frames - 1 : frames) * PANEL;
  const steps = Math.max(1, holds ? frames - 1 : frames);
  const duration = cycleSeconds(character, animation);
  const moon = scene.body?.kind === 'moon';
  const bodyX = moon ? 102 : SUN.cx;
  const bodyY = moon ? 24 : SUN.cy;
  const bodyR = moon ? 8 : SUN.r;

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
        {/* The hour, top of the sky to the horizon. */}
        <linearGradient id="oled-sky" x1="0" y1="0" x2="0" y2="1">
          {scene.sky.map((stop, i) => (
            <stop key={stop + i} offset={`${(i / (scene.sky.length - 1)) * 100}%`} stopColor={stop} />
          ))}
        </linearGradient>
        {/*
          The halo. Real, not decoration: a bright disc seen through atmosphere
          scatters into the air around it, which is why the moon has a ring on a
          humid night and none in thin mountain air.
        */}
        <radialGradient id="oled-halo">
          <stop offset="0%" stopColor={scene.body?.glow ?? '#000000'} stopOpacity="0.55" />
          <stop offset="100%" stopColor={scene.body?.glow ?? '#000000'} stopOpacity="0" />
        </radialGradient>
      </defs>

      <style>{`
        @keyframes ${anim} { to { transform: translateX(-${travel.toFixed(4)}px); } }
        .oled-strip-${character}-${animation} {
          animation: ${anim} ${duration.toFixed(3)}s steps(${steps}) infinite;
          ${holds ? 'animation-iteration-count: 1; animation-fill-mode: forwards;' : ''}
        }
        @keyframes oled-petal-drift {
          from { transform: translate(0, 0); }
          to { transform: translate(-${PANEL}px, ${PANEL * 0.55}px); }
        }
        .oled-petal {
          animation-name: oled-petal-drift;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .oled-strip-${character}-${animation}, .oled-petal { animation: none; }
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
      {/*
        The picture. One nested viewBox holds the whole panel in PANEL PIXELS,
        so the backdrop and the sprite are drawn on the same grid and cannot
        drift apart when the housing geometry changes.
      */}
      <g clipPath="url(#oled-active)" filter="url(#oled-bloom)">
        <svg
          x={activeX}
          y={activeY}
          width={OLED.mmWidth}
          height={OLED.mmHeight}
          viewBox={`0 0 ${PANEL} ${PANEL}`}
          preserveAspectRatio="none"
        >
          <rect width={PANEL} height={PANEL} fill="url(#oled-sky)" />

          {/* Stars, thinning out toward the light at the horizon. */}
          {stars(scene.stars).map((star) => (
            <rect
              key={`${star.x}-${star.y}`}
              x={star.x}
              y={star.y}
              width={star.r * 2}
              height={star.r * 2}
              fill={PALETTE.star}
              opacity={star.opacity}
            />
          ))}

          {scene.body && (
            <>
              <circle cx={bodyX} cy={bodyY} r={bodyR * 2.6} fill="url(#oled-halo)" />
              {/*
                A full disc. It was a crescent, cut by overlaying the sky on the
                unlit limb — which is correct for a real moon and read on this
                panel as an eclipse, because at 128 pixels beside a mountain
                there is nothing to give the shape a scale.
              */}
              <circle cx={bodyX} cy={bodyY} r={bodyR} fill={scene.body.fill} />
            </>
          )}

          <path d={fujiPath()} fill={scene.fuji} />
          <path d={snowPath()} fill={scene.fujiSnow} />

          <path d={ridgePath(RIDGE_MID, HORIZON.mid)} fill={scene.ridgeMid} />
          {/* Mist settles in the valley, which is where cold air pools. */}
          <rect x={0} y={HORIZON.mid - 4} width={PANEL} height={7} fill={scene.mist} opacity={0.2} />
          <path d={ridgePath(RIDGE_NEAR, HORIZON.near)} fill={scene.ridgeNear} />
          <rect x={0} y={HORIZON.near - 3} width={PANEL} height={6} fill={scene.mist} opacity={0.14} />

          {toriiParts().map((part) => (
            <rect
              key={`${part.x}-${part.y}-${part.w}`}
              x={part.x}
              y={part.y}
              width={part.w}
              height={part.h}
              fill={scene.torii}
            />
          ))}

          <rect x={0} y={HORIZON.near} width={PANEL} height={PANEL - HORIZON.near} fill={scene.ground} />

          {/* Blossom, each petal on its own pace so they never march in step. */}
          {petals(scene.petals).map((petal, i) => (
            <rect
              key={`${petal.x}-${petal.y}`}
              x={petal.x}
              y={petal.y}
              width={2}
              height={2}
              fill={PALETTE.petal}
              opacity={0.75}
              className={reduced ? undefined : 'oled-petal'}
              style={reduced ? undefined : { animationDuration: `${petal.drift}s`, animationDelay: `${petal.delay}s` }}
            />
          ))}

          <g className={reduced ? undefined : `oled-strip-${character}-${animation}`}>
            <image
              href={spriteSrc(character, animation)}
              x={0}
              y={0}
              width={frames * PANEL}
              height={PANEL}
              preserveAspectRatio="none"
              style={{ imageRendering: 'pixelated' }}
            />
          </g>
        </svg>
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
