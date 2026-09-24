'use client';

/**
 * The globe of the notebook entry "Earth we live on": the world in pencil and
 * crayon, turning. Drag it to spin it. The drawing is `lib/globe/render.ts`;
 * this component only keeps the clock and the reader's hand.
 *
 * The globe turns at one steady speed, drawn frame by frame (`FPS`); a drag
 * adds to the turn and carries on a little after letting go. Nothing is timed
 * off anything else, so nothing can jump. Scrolled away or in a hidden tab,
 * it stops, and carries on from the same place.
 *
 * With reduced motion it does not turn by itself: two buttons turn it, a
 * sixth of the way round at a time.
 */

import { useEffect, useRef, useState } from 'react';
import { globeCopy } from '@/content/globe';
import { asset } from '@/lib/asset';
import { holdLoader } from '@/lib/ready';
import { prefersReducedMotion } from '@/lib/gsap';
import { CRAYONS } from '@/lib/globe/colours';
import { createScene, type GlobePalette, type Scene } from '@/lib/globe/render';
import { sheetFrom } from '@/lib/globe/sheet';
import { FPS, spinAt } from '@/lib/globe/view';
import styles from './Globe.module.css';

/**
 * The crayon map, coloured when the site is built (`scripts/make-globe-sheet.mjs`):
 * the larger for a globe big enough on the screen to show its detail.
 */
const SHEETS = [
  { width: 3072, from: 440 },
  { width: 2048, from: 0 },
] as const;

/** With reduced motion, how far each turn button turns the globe, degrees. */
const STILL_TURN = 60;

export function readGlobePalette(entry: HTMLElement): GlobePalette {
  const css = getComputedStyle(entry);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    paper: v('--globe-paper'),
    dusk: v('--globe-dusk'),
    graphite: v('--globe-graphite'),
    shadow: v('--globe-shadow'),
    crayons: CRAYONS.map((c) => v(`--globe-${c}`)),
  };
}

export function Globe() {
  const [reduced, setReduced] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** Degrees the reader has turned the globe, and the spin left over from a drag (degrees a second). */
  const hand = useRef({ turned: 0, fling: 0, redraw: true });

  useEffect(() => {
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    const back = backRef.current;
    if (!frame || !canvas || !back) return;

    const still = prefersReducedMotion();
    setReduced(still);
    const h = hand.current;
    const release = holdLoader();
    const box = frame.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const radius = Math.min(box.width, box.height) * 0.4 * dpr;
    const { width } = SHEETS.find((s) => radius >= s.from)!;
    let scene: Scene | null = null;
    let gone = false;
    const picture = new Image();
    picture.decoding = 'async';
    picture.src = asset(`/notebook/earth/crayon-${width}.webp`);
    picture
      .decode()
      .then(() => {
        if (gone) return;
        scene = createScene(back, canvas, readGlobePalette(frame), sheetFrom(picture, width));
        const b = frame.getBoundingClientRect();
        scene.resize(b.width, b.height, Math.min(2, window.devicePixelRatio || 1));
        h.redraw = true;
      })
      // Without its picture the globe is simply not drawn; the loader must not wait for it.
      .catch(release);

    let sized = 0;
    const resize = new ResizeObserver(() => {
      window.clearTimeout(sized);
      sized = window.setTimeout(() => {
        const b = frame.getBoundingClientRect();
        scene?.resize(b.width, b.height, Math.min(2, window.devicePixelRatio || 1));
        h.redraw = true;
      }, 150);
    });
    resize.observe(frame);

    let onScreen = true;
    const seen = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
    });
    seen.observe(frame);

    // Drag to spin. The pointer is captured only once it has moved: capturing
    // on press would swallow clicks (CLAUDE.md).
    let press: { x: number; last: number; at: number; dragging: boolean; id: number } | null = null;
    const down = (e: PointerEvent) => {
      press = { x: e.clientX, last: e.clientX, at: performance.now(), dragging: false, id: e.pointerId };
    };
    const move = (e: PointerEvent) => {
      if (!press || e.pointerId !== press.id) return;
      if (!press.dragging && Math.abs(e.clientX - press.x) > 4) {
        press.dragging = true;
        canvas.setPointerCapture(e.pointerId);
      }
      if (!press.dragging) return;
      const degrees = ((e.clientX - press.last) / (scene?.globe().r ?? 200)) * (180 / Math.PI);
      const now = performance.now();
      h.turned += degrees;
      h.fling = still ? 0 : degrees / Math.max(0.008, (now - press.at) / 1000);
      h.redraw = true;
      press.last = e.clientX;
      press.at = now;
    };
    const up = (e: PointerEvent) => {
      if (!press || e.pointerId !== press.id) return;
      if (press.dragging) canvas.releasePointerCapture(e.pointerId);
      else h.fling = 0;
      press = null;
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);

    let raf = 0;
    let t = 0;
    let last = performance.now();
    let shown = -1;
    let released = false;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      // A frame can be stamped a moment before the loop began: never step backwards.
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;
      if (!scene || !onScreen || document.hidden) return;
      if (!still) t += dt;
      if (Math.abs(h.fling) > 0.5 && !press?.dragging) {
        h.turned += h.fling * dt;
        h.fling *= Math.exp(-3 * dt);
        h.redraw = true;
      }
      // Frame by frame: a new picture only on the drawing's own frames, or when the reader turns it.
      const frameNo = Math.floor(t * FPS);
      if (!h.redraw && frameNo === shown) return;
      h.redraw = false;
      shown = frameNo;
      scene.draw(spinAt(frameNo / FPS) + h.turned);
      if (!released) {
        released = true;
        release();
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      gone = true;
      cancelAnimationFrame(raf);
      resize.disconnect();
      seen.disconnect();
      window.clearTimeout(sized);
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      release();
    };
  }, []);

  const turn = (by: number) => {
    hand.current.turned += by;
    hand.current.redraw = true;
  };

  const keys = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      turn(e.key === 'ArrowLeft' ? -15 : 15);
    }
  };

  return (
    <figure className={styles.globe}>
      <div className={styles.frame} ref={frameRef}>
        <canvas className={styles.canvas} ref={backRef} aria-hidden="true" />
        <canvas className={styles.canvas} ref={canvasRef} role="img" aria-label={globeCopy.drawing} tabIndex={0} onKeyDown={keys} data-cursor="Spin" />
      </div>
      <figcaption className={styles.caption}>
        {reduced ? (
          <span className={styles.turns}>
            <button type="button" onClick={() => turn(-STILL_TURN)}>
              ◀ {globeCopy.turn.left}
            </button>
            <button type="button" onClick={() => turn(STILL_TURN)}>
              {globeCopy.turn.right} ▶
            </button>
          </span>
        ) : (
          globeCopy.drag
        )}
      </figcaption>
    </figure>
  );
}
