'use client';

/**
 * THE LANDING'S FILM.
 *
 * A full-screen watercolour of Nvidia's campus in Santa Clara, drawn in
 * pencil, painted, and carried through a year of seasons and weather — the
 * engine is `src/lib/film`, the shots are `src/content/film.ts`. This is the
 * frame round it: the painting's title and caption in the corner, the shots
 * along the bottom to jump between, and a pause.
 *
 * ---
 *
 * WITHOUT THE SCRIPT
 *
 * The canvas is empty and the painting's title is still written in the
 * corner; the contents follow underneath. Nothing is hidden by CSS.
 *
 * REDUCED MOTION
 *
 * No pencil, no brush, no timelapse: the painting is there finished, still,
 * and every shot is a button — the same year, turned by hand.
 *
 * THE LOADER
 *
 * The engine builds its campus and first layers as it mounts, and holds the
 * loader until it has; under reduced motion it holds until the whole painting
 * is done, since that is what will be shown.
 */

import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '@/lib/gsap';
import { useUi } from '@/lib/store';
import { holdLoader } from '@/lib/ready';
import { film as copy, shots } from '@/content/film';
import { createFilm, type Film as Engine } from '@/lib/film/film';
import styles from './Film.module.css';

export function Film() {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const strip = useRef<HTMLOListElement>(null);
  const engine = useRef<Engine | null>(null);
  const entered = useUi((s) => s.entered);
  const [caption, setCaption] = useState('');
  const [index, setIndex] = useState(-1);
  const [dark, setDark] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const el = canvas.current;
    const section = root.current;
    if (!el || !section) return;
    const release = holdLoader();
    const reduced = prefersReducedMotion();
    setStill(reduced);
    const film = createFilm(el, {
      reduced,
      hooks: {
        onCaption(text, i) {
          setCaption(text);
          setIndex(i);
        },
        onDark: setDark,
        onProgress(f) {
          strip.current?.style.setProperty('--p', f.toFixed(4));
        },
      },
    });
    engine.current = film;
    release();
    if (process.env.NODE_ENV !== 'production') (window as unknown as { __film?: Engine }).__film = film;

    // Only paint while someone can see it.
    const io = new IntersectionObserver(([e]) => film.setVisible(e.isIntersecting && !document.hidden), { threshold: 0.01 });
    io.observe(section);
    const onVis = () => film.setVisible(!document.hidden && section.getBoundingClientRect().bottom > 0);
    document.addEventListener('visibilitychange', onVis);
    let pending = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => film.resize());
    });
    ro.observe(el);

    return () => {
      io.disconnect();
      ro.disconnect();
      cancelAnimationFrame(pending);
      document.removeEventListener('visibilitychange', onVis);
      film.destroy();
      engine.current = null;
    };
  }, []);

  useEffect(() => {
    if (entered) engine.current?.begin();
  }, [entered]);

  const toggle = () => {
    const next = !playing;
    setPlaying(next);
    engine.current?.setPlaying(next);
  };

  return (
    <section ref={root} className={styles.film} data-film aria-label={copy.description} data-film-dark={dark ? '' : undefined}>
      <canvas ref={canvas} className={styles.canvas} role="img" aria-label={caption ? `${copy.title} — ${caption}` : copy.title} />

      <div className={styles.plate}>
        <p className={styles.title}>{copy.title}</p>
        <p className={styles.caption} aria-live="polite">
          <span key={caption} className={styles.captionText}>
            {caption}
          </span>
        </p>
      </div>

      <div className={styles.controls}>
        <ol ref={strip} className={styles.strip} aria-label="Shots">
          {shots.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                className={styles.shot}
                aria-pressed={i === index}
                onClick={() => {
                  engine.current?.goTo(i);
                  if (still) {
                    setIndex(i);
                    setCaption(s.label);
                  }
                }}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ol>
        {!still && (
          <button type="button" className={styles.pause} onClick={toggle} aria-pressed={!playing}>
            {playing ? 'pause' : 'play'}
          </button>
        )}
      </div>
    </section>
  );
}
