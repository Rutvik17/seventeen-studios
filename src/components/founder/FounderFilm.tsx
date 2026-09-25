'use client';

/**
 * THE FOUNDER PAGE'S FILM.
 *
 * Rutvik, sketched from his photograph and painted, and then the story of what
 * he builds, from the bottom: a switch, a byte, gates, a processor, C++ down
 * to machine code, a GPU, a matrix product, a neuron, learning, a language
 * model, an agent — and back to him. The engine is `lib/founder/director.ts`;
 * the script is `content/founder.ts`. This is the frame round it: each
 * scene's title and lines written in the corner, the scenes along the bottom
 * to jump between, a pause, and the résumé.
 *
 * ---
 *
 * WITHOUT THE SCRIPT
 *
 * The canvas is empty; the first scene's caption, every scene's name and the
 * résumé links are plain HTML. Nothing is hidden by CSS.
 *
 * REDUCED MOTION
 *
 * No pencil, brush or wash-out: each scene is its finished painting, still,
 * and the strip along the bottom turns them by hand.
 *
 * THE LOADER
 *
 * Held until the photograph has loaded and been read into a drawing.
 */

import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '@/lib/gsap';
import { useUi } from '@/lib/store';
import { holdLoader } from '@/lib/ready';
import { founderFilm as copy, scenes } from '@/content/founder';
import { createFounderFilm, type FounderFilm as Engine } from '@/lib/founder/director';
import { loadPhoto } from '@/lib/founder/portrait';
import { ContactLink } from '@/components/ContactLink';
import styles from './FounderFilm.module.css';

export function FounderFilm({ sizes }: { sizes: Record<string, string> }) {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const strip = useRef<HTMLOListElement>(null);
  const engine = useRef<Engine | null>(null);
  const entered = useUi((s) => s.entered);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [still, setStill] = useState(false);
  const [alt, setAlt] = useState('');

  useEffect(() => {
    const el = canvas.current;
    const section = root.current;
    if (!el || !section) return;
    const release = holdLoader();
    const reduced = prefersReducedMotion();
    setStill(reduced);
    const hand = getComputedStyle(document.documentElement).getPropertyValue('--font-hand').trim() || 'cursive';
    let film: Engine | null = null;
    let cancelled = false;
    let io: IntersectionObserver | null = null;
    let ro: ResizeObserver | null = null;
    let pending = 0;
    const onVis = () => film?.setVisible(!document.hidden);

    // A different drawing of him on each visit — or the one asked for, `?photo=<id>` (the share card uses it).
    const asked = new URLSearchParams(window.location.search).get('photo');
    const photo = copy.photos.find((p) => p.id === asked) ?? copy.photos[Math.floor(Math.random() * copy.photos.length)];
    setAlt(photo.alt);
    Promise.all([loadPhoto(photo.src), document.fonts?.load(`600 30px ${hand}`).catch(() => undefined)])
      .then(([image]) => {
        if (cancelled) return;
        film = createFounderFilm(el, {
          image,
          photo,
          reduced,
          hand,
          hooks: {
            onScene: setIndex,
            onProgress(f) {
              strip.current?.style.setProperty('--p', f.toFixed(4));
            },
          },
        });
        engine.current = film;
        if (useUi.getState().entered) film.begin();
        io = new IntersectionObserver(([e]) => film?.setVisible(e.isIntersecting && !document.hidden), { threshold: 0.01 });
        io.observe(section);
        document.addEventListener('visibilitychange', onVis);
        ro = new ResizeObserver(() => {
          cancelAnimationFrame(pending);
          pending = requestAnimationFrame(() => film?.resize());
        });
        ro.observe(el);
      })
      .catch(() => undefined)
      .finally(release);

    return () => {
      cancelled = true;
      io?.disconnect();
      ro?.disconnect();
      cancelAnimationFrame(pending);
      document.removeEventListener('visibilitychange', onVis);
      film?.destroy();
      engine.current = null;
      release();
    };
  }, []);

  useEffect(() => {
    if (entered) engine.current?.begin();
  }, [entered]);

  const scene = scenes[index];
  const last = index === scenes.length - 1;

  return (
    <section ref={root} className={styles.film} data-film aria-label={copy.description}>
      <canvas ref={canvas} className={styles.canvas} role="img" aria-label={`${scene.id === 'portrait' || scene.id === 'return' ? `${scene.title}, painted ${alt}` : scene.title} — ${scene.lines.join(' ')}`} />

      <div className={styles.plate} aria-live="polite" data-face={scene.id === 'portrait' || scene.id === 'return' ? '' : undefined}>
        <h1 key={`t${index}`} className={styles.title}>
          <span>{scene.title}</span>
        </h1>
        {scene.lines.map((line, i) => (
          <p key={`${index}-${i}`} className={styles.line} style={{ animationDelay: `${0.5 + i * 0.9}s` }}>
            {line}
          </p>
        ))}
        {last && (
          <p className={styles.line} style={{ animationDelay: '1.4s' }}>
            <ContactLink className={styles.contact}>{copy.contact}</ContactLink>
            {copy.downloads.map((d) => (
              <a key={d.format} className={styles.inline} href={d.href} download data-cursor="Take a copy">
                {d.label}
              </a>
            ))}
          </p>
        )}
      </div>

      <ul className={styles.downloads} aria-label="Résumé">
        {copy.downloads.map((d) => (
          <li key={d.format}>
            <a href={d.href} download data-cursor="Take a copy">
              {d.label} <span className={styles.size}>{sizes[d.format]}</span>
            </a>
          </li>
        ))}
      </ul>

      <div className={styles.controls}>
        <ol ref={strip} className={styles.strip} aria-label="Scenes">
          {scenes.map((s, i) => (
            <li key={s.id}>
              <button type="button" className={styles.shot} aria-pressed={i === index} onClick={() => engine.current?.goTo(i)}>
                {s.strip}
              </button>
            </li>
          ))}
        </ol>
        {!still && (
          <button
            type="button"
            className={styles.pause}
            aria-pressed={!playing}
            onClick={() => {
              engine.current?.setPlaying(!playing);
              setPlaying(!playing);
            }}
          >
            {playing ? 'pause' : 'play'}
          </button>
        )}
      </div>
    </section>
  );
}
