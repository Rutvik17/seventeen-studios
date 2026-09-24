'use client';

/**
 * Beside the globe: a button for each continent, and that continent sketched
 * on the page in pencil and coloured in paint (`lib/globe/sketch.ts`) — the
 * first one as the page comes into view, then whichever is chosen.
 *
 * With reduced motion the sketch appears finished.
 */

import { useEffect, useRef, useState } from 'react';
import { globeCopy } from '@/content/globe';
import { prefersReducedMotion } from '@/lib/gsap';
import { useUi } from '@/lib/store';
import { CONTINENT_IDS, type ContinentId } from '@/lib/globe/continents';
import { createContinentSketch, type ContinentSketch } from '@/lib/globe/sketch';
import { readGlobePalette } from './Globe';
import styles from './Globe.module.css';

export function Continents() {
  const [chosen, setChosen] = useState<ContinentId>(CONTINENT_IDS[0]);
  const entered = useUi((s) => s.entered);
  const holderRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sketch = useRef<ContinentSketch | null>(null);
  /** Starts the loop that draws the sketch until it is finished. */
  const wake = useRef<() => void>(() => {});
  const seen = useRef(false);
  const still = useRef(false);

  useEffect(() => {
    const holder = holderRef.current;
    const canvas = canvasRef.current;
    if (!holder || !canvas) return;
    still.current = prefersReducedMotion();
    const pal = readGlobePalette(holder);
    const hand = getComputedStyle(document.documentElement).getPropertyValue('--font-hand').trim() || 'cursive';
    const s = createContinentSketch(canvas, { graphite: pal.graphite, paints: pal.paints, hand });
    sketch.current = s;
    const size = () => {
      const b = holder.getBoundingClientRect();
      s.resize(b.width, b.height, Math.min(2, window.devicePixelRatio || 1));
      wake.current();
    };
    size();
    let sized = 0;
    const resize = new ResizeObserver(() => {
      window.clearTimeout(sized);
      sized = window.setTimeout(size, 150);
    });
    resize.observe(holder);

    let raf = 0;
    const tick = () => {
      raf = s.draw(performance.now() / 1000) ? requestAnimationFrame(tick) : 0;
    };
    wake.current = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      window.clearTimeout(sized);
      sketch.current = null;
    };
  }, []);

  // The first sketch waits for the page to be uncovered and in view.
  useEffect(() => {
    const holder = holderRef.current;
    if (!entered || !holder) return;
    const watch = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || seen.current) return;
        seen.current = true;
        watch.disconnect();
        sketch.current?.show(chosen, globeCopy.continents[chosen], performance.now() / 1000, still.current);
        wake.current();
      },
      { threshold: 0.35 },
    );
    watch.observe(holder);
    return () => watch.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entered]);

  const choose = (id: ContinentId) => {
    setChosen(id);
    seen.current = true;
    sketch.current?.show(id, globeCopy.continents[id], performance.now() / 1000, still.current);
    wake.current();
  };

  return (
    <div className={styles.continents}>
      <div className={styles.picks} role="group" aria-label={globeCopy.pick}>
        {CONTINENT_IDS.map((id) => (
          <button key={id} type="button" onClick={() => choose(id)} aria-pressed={id === chosen}>
            {globeCopy.continents[id]}
          </button>
        ))}
      </div>
      <div className={styles.sketch} ref={holderRef}>
        <canvas className={styles.canvas} ref={canvasRef} role="img" aria-label={globeCopy.sketched(globeCopy.continents[chosen])} />
      </div>
    </div>
  );
}
