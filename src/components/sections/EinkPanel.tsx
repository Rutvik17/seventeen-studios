'use client';

/**
 * The board's display: a real e-ink render, composed and shaded.
 *
 * Lays the face and the readout out on a 296 × 128 grid — the actual resolution
 * of the 2.9" three-colour panel this board is designed around — then hands the
 * bitmap to `renderEink` for the paper treatment.
 *
 * ---
 *
 * WHY IT IS AN <image> INSIDE THE SVG
 *
 * The whole board is an SVG, and the panel has to sit inside it, scale with it,
 * and land at the same place at every viewport width. Overlaying a live WebGL
 * canvas would mean recomputing its screen rectangle from the SVG's viewBox on
 * every resize — fragile, and pointless for a picture that never changes.
 *
 * E-ink holds its image with the power off. Rendering once and placing the
 * result as an image is not a shortcut around the hard version; it is what the
 * hardware does.
 *
 * ---
 *
 * WHY LAYOUT IS ARITHMETIC AND NOT `fillText`
 *
 * Every position below is an integer number of panel pixels, computed from the
 * measured width of a bitmap string. That is the fix for characters rendering
 * incorrectly: nothing is centred by eye, nothing lands on a half pixel, and a
 * line that would not fit is caught by measuring it rather than by looking.
 */

import { useEffect, useState } from 'react';
import { Bitmap, INK, type Ink } from '@/lib/pixelfont';
import { PANEL, inkFor } from '@/lib/pixel';
import { FACE_SIZE, expressionFor, faceCells } from '@/lib/face';

export type EinkPanelProps = {
  /** Placement in board millimetres. */
  x: number;
  y: number;
  width: number;
  height: number;
  symbol: string;
  price: number;
  changePercent: number;
  sigmas: number;
  asOf: string;
  /** Where the model sits in its own range, 0 to 1. Drives the expression. */
  percentile: number;
};

/** Compose the panel's bitmap. Pure, so it can be reasoned about and tested. */
function compose(props: EinkPanelProps): Bitmap {
  const bmp = new Bitmap(PANEL.width, PANEL.height);
  const { symbol, price, changePercent, sigmas } = props;

  /*
    Red down, green up — the convention every reader of a market screen already
    carries. A convention the audience already holds beats any palette chosen
    for its own sake, and it is the whole reason this design moved to a
    seven-colour panel: a three-colour one has a single accent and physically
    cannot show both.
  */
  const mood = inkFor(sigmas);
  const moodInk: Ink = mood === 'green' ? INK.green : mood === 'red' ? INK.red : INK.black;

  /* ---- the face, left ---- */
  /*
    The expression comes from the MODEL, not from today's move. It is where the
    model's probability sits inside its own output distribution — the raw
    probabilities span about two percentage points, so a threshold on them would
    leave the companion permanently neutral.

    The colour still comes from the move, because red-down/green-up is what a
    reader already expects from a market screen. Mood from the model, sign from
    the market.
  */
  const FACE = 10;
  const faceX = 24;
  const faceY = Math.round((PANEL.height - FACE_SIZE * FACE) / 2);
  for (const cell of faceCells(expressionFor(props.percentile))) {
    bmp.fillRect(faceX + cell.x * FACE, faceY + cell.y * FACE, FACE, FACE, moodInk);
  }

  /* ---- a rule between face and figures ---- */
  const railX = faceX + FACE_SIZE * FACE + 28;
  bmp.fillRect(railX, 40, 2, PANEL.height - 80, INK.black);

  /* ---- the readout, right ---- */
  const textX = railX + 32;
  /*
    Every line is drawn at the largest scale that FITS the remaining width,
    never at a scale chosen by eye. Measuring first removes the whole class of
    bug rather than the instances of it.
  */
  const room = PANEL.width - textX - 24;

  bmp.fitText(textX, 62, symbol, INK.black, 7, room);

  const move = `${changePercent >= 0 ? '+' : '-'}${Math.abs(changePercent).toFixed(2)}%`;
  bmp.fitText(textX, 130, move, moodInk, 10, room);

  bmp.fitText(textX, 240, `$${price.toFixed(2)}`, INK.black, 5, room);
  const conf = `MODEL ${Math.round(props.percentile * 100)} PCT`;
  bmp.fitText(textX, 292, conf, INK.black, 4, room);

  return bmp;
}

export function EinkPanel(props: EinkPanelProps) {
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Dynamic import so three.js is not pulled into the landing's first load
    // for a picture that appears in the fifth act.
    import('@/lib/webgl/eink')
      .then(({ renderEink }) => {
        if (cancelled) return;
        /*
          The ghost is the panel showing a flat move — the image a device would
          most often be replacing, since most days are unremarkable. Passing the
          same bitmap as its own ghost would produce no residue at all, which
          defeats the point.
        */
        const ghost = compose({ ...props, changePercent: 0, sigmas: 0, percentile: 0.5 });
        // Scale 2 on a 640 x 400 panel is a 1280 x 800 render, which is more
        // than enough for the capsule texture to read at the size it appears.
        setHref(renderEink(compose(props), { scale: 2, ghost }));
      })
      .catch(() => {
        /* No WebGL. The plain SVG panel below stays. */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.symbol, props.price, props.changePercent, props.sigmas, props.percentile]);

  const { x, y, width, height } = props;

  /*
    The active area, inset in its bezel. A 2.9" panel is 79 × 36 mm overall with
    a 66.9 × 29.05 mm image, so the border is real and not a design flourish —
    drawing the image edge to edge is a tell that nobody has held one.
  */
  const inset = (width - PANEL.mmWidth) / 2;
  const activeX = x + inset;
  const activeY = y + inset;

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={1.2} fill="var(--pcb-bezel)" />
      {href ? (
        <image
          href={href}
          x={activeX}
          y={activeY}
          width={PANEL.mmWidth}
          height={PANEL.mmHeight}
          preserveAspectRatio="none"
        />
      ) : (
        // Present before the shader has run and if it never does, so the board
        // is never a blank rectangle waiting on a chunk (rule 4).
        <rect
          x={activeX}
          y={activeY}
          width={PANEL.mmWidth}
          height={PANEL.mmHeight}
          fill="#eae7de"
        />
      )}
    </g>
  );
}
