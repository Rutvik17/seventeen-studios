'use client';

/**
 * The board's display: a real e-ink render, composed and shaded.
 *
 * Lays the readout out on the panel's own pixel grid, then hands the bitmap to
 * `renderEink` for the paper treatment.
 *
 * The FACE is not here. It moved to the OLED — e-paper cannot animate and this
 * panel holds its image for nothing, so the numbers live here and the companion
 * lives on the display that can move. See `OledModule.tsx`.
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
import { site } from '@/content/studio';
import { PANEL, inkFor } from '@/lib/pixel';

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
  /**
   * ISO instant the data was captured — the fallback before the clock starts.
   *
   * The strip normally shows the LIVE time; this is what it reads during server
   * render and in the first frame, so the markup is deterministic.
   */
  stamp: string;
};

/**
 * The status strip's two halves.
 *
 * Uppercase and abbreviated because the font has no lowercase, and 24-hour
 * because a device on a shelf has no room for AM/PM and no reason to be
 * ambiguous.
 *
 * ---
 *
 * EASTERN, NOT UTC
 *
 * This used to render in UTC, on the reasoning that the panel is a picture
 * built on a server and a "local" time would be the BUILD machine's local time,
 * which is nobody's. The concern was right and the fix was wrong: the problem
 * with local time is that it is UNNAMED, not that it is local. Naming the zone
 * explicitly removes it — `America/Toronto` is the same instant whichever
 * machine formats it, and it is where the device would actually sit.
 *
 * It also has to be a zone rather than an offset, because the offset changes
 * twice a year: Toronto is EST (UTC−5) in winter and EDT (UTC−4) in summer, so
 * a hard-coded −5 prints the wrong hour for half of every year. `ET` covers
 * both and is already what the clock in the site header says, so the two
 * cannot disagree.
 */
function formatStamp(at: string | number): { date: string; time: string } {
  const d = typeof at === 'number' ? new Date(at) : at ? new Date(at) : new Date(0);
  if (Number.isNaN(d.getTime())) return { date: '', time: '' };

  const zone = { timeZone: site.timezone } as const;
  const day = new Intl.DateTimeFormat('en-GB', { ...zone, day: '2-digit' }).format(d);
  const month = new Intl.DateTimeFormat('en-GB', { ...zone, month: 'short' })
    .format(d)
    .toUpperCase();
  const time = new Intl.DateTimeFormat('en-GB', {
    ...zone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);

  return { date: `${day} ${month}`, time: `${time} ${site.timezoneLabel}` };
}

/** Compose the panel's bitmap. Pure, so it can be reasoned about and tested. */
function compose(props: EinkPanelProps & { at?: number | null }): Bitmap {
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

  /*
    ---- the status strip, across the top ----

    A real dashboard says WHEN before it says anything else, and it says it in
    the corner rather than in the body. The date used to be the fourth line of
    the readout, competing with the price for the same eye — which is the wrong
    place for a timestamp: you glance at it once to decide whether to trust the
    rest, and then never again.
  */
  const STRIP = 3;
  const stamped = formatStamp(props.at ?? props.stamp);
  bmp.text(24, 16, stamped.date, INK.black, STRIP);
  const timeW = Bitmap.measure(stamped.time, STRIP);
  bmp.text(PANEL.width - 24 - timeW, 16, stamped.time, INK.black, STRIP);
  // A hairline under it, so the strip reads as chrome rather than as content.
  bmp.fillRect(24, 48, PANEL.width - 48, 1, INK.black);

  /*
    ---- the readout, across the whole panel ----

    THE FACE USED TO LIVE HERE AND HAS MOVED TO THE OLED.

    It was drawn on the left and the figures were squeezed into what was left,
    which was the right layout for a device with one display and the wrong one
    for a device with two. E-paper holds an image for nothing and cannot animate;
    the OLED can animate and costs current for every second it is lit. So the
    numbers stay here, where they are free, and the companion moved to the panel
    that can move — see `components/sections/OledModule.tsx`.

    Giving the figures the full width is not tidying up after the move. It is
    the point of the device: the panel is read from across a room, and the
    largest thing on it should be the number, which is now roughly twice the
    size it could be while sharing the glass with a face.
  */
  const TOP = 62;
  const textX = 24;
  /*
    Every line is drawn at the largest scale that FITS the remaining width,
    never at a scale chosen by eye. Measuring first removes the whole class of
    bug rather than the instances of it.
  */
  const room = PANEL.width - textX - 24;

  bmp.fitText(textX, TOP + 34, symbol, INK.black, 7, room);

  const move = `${changePercent >= 0 ? '+' : '-'}${Math.abs(changePercent).toFixed(2)}%`;
  bmp.fitText(textX, TOP + 104, move, moodInk, 10, room);

  bmp.fitText(textX, TOP + 214, `$${price.toFixed(2)}`, INK.black, 5, room);

  return bmp;
}

export function EinkPanel(props: EinkPanelProps) {
  const [href, setHref] = useState<string | null>(null);
  /*
    The live clock.
    
    Starts as null so the server and the first client frame agree — seeding it
    from `Date.now()` would render one time on the server and a different one in
    the browser, which React reports as a hydration mismatch and then throws the
    whole subtree away.

    The interval is aligned to the next minute boundary rather than firing every
    60,000ms from mount, so the display changes ON the minute the way a clock
    does instead of at whatever offset the page happened to load at.
  */
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    let interval: number | undefined;
    const align = window.setTimeout(() => {
      setNow(Date.now());
      interval = window.setInterval(() => setNow(Date.now()), 60_000);
    }, 60_000 - (Date.now() % 60_000));

    return () => {
      window.clearTimeout(align);
      if (interval) window.clearInterval(interval);
    };
  }, []);

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
        const ghost = compose({ ...props, changePercent: 0, sigmas: 0 });
        // Scale 2 on a 640 x 400 panel is a 1280 x 800 render, which is more
        // than enough for the capsule texture to read at the size it appears.
        setHref(renderEink(compose({ ...props, at: now }), { scale: 2, ghost }));
      })
      .catch(() => {
        /* No WebGL. The plain SVG panel below stays. */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // `now` is in the dependency list, so the panel is re-rendered once a
    // minute. A full WebGL pass costs about twenty milliseconds and happens
    // sixty times an hour, which is nothing — and it is the only way to move
    // pixels inside an image that has already been rasterised.
  }, [props.symbol, props.price, props.changePercent, props.sigmas, props.stamp, now]);

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
