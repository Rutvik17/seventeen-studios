'use client';

/**
 * THE FOUNDER PAGE.
 *
 * Rutvik, sketched from a photograph of him and painted, with his name and
 * what he does now written beside him, a way to write to him and the résumé.
 * The painting is `lib/founder/director.ts`; the words are `content/founder.ts`.
 *
 * ---
 *
 * WITHOUT THE SCRIPT
 *
 * The canvas is empty; the words and the résumé links are plain HTML.
 * Nothing is hidden by CSS.
 *
 * REDUCED MOTION
 *
 * No pencil or brush: the finished painting, still.
 *
 * THE LOADER
 *
 * Held until the photograph has loaded and been read into a drawing.
 */

import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '@/lib/gsap';
import { useUi } from '@/lib/store';
import { holdLoader } from '@/lib/ready';
import { founderFilm as copy, now } from '@/content/founder';
import { createFounderFilm, type FounderFilm as Engine } from '@/lib/founder/director';
import { loadPhoto } from '@/lib/founder/portrait';
import { ContactLink } from '@/components/ContactLink';
import styles from './FounderFilm.module.css';

export function FounderFilm({ sizes }: { sizes: Record<string, string> }) {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<Engine | null>(null);
  const entered = useUi((s) => s.entered);
  const [alt, setAlt] = useState('');

  useEffect(() => {
    const el = canvas.current;
    const section = root.current;
    if (!el || !section) return;
    const release = holdLoader();
    const reduced = prefersReducedMotion();
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

  return (
    <section ref={root} className={styles.film} data-film aria-label={copy.description}>
      <canvas ref={canvas} className={styles.canvas} role="img" aria-label={`${now.title}, painted ${alt}`} />

      <div className={styles.plate} data-face="">
        <h1 className={styles.title}>
          <span>{now.title}</span>
        </h1>
        {now.lines.map((line, i) => (
          <p key={i} className={styles.line} style={{ animationDelay: `${0.5 + i * 0.9}s` }}>
            {line}
          </p>
        ))}
        <p className={styles.line} style={{ animationDelay: `${0.5 + now.lines.length * 0.9}s` }}>
          <ContactLink className={styles.contact} data-cursor-accent="">{copy.contact}</ContactLink>
          {copy.downloads.map((d) => (
            <a key={d.format} className={styles.inline} href={d.href} download data-cursor="Take a copy">
              {d.label}
            </a>
          ))}
        </p>
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
    </section>
  );
}
