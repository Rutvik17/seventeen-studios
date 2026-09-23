'use client';

/**
 * Rocket physics, in four chapters on one page: lift-off, staging, orbit and
 * landing. One button, one drawing, one working panel; the chapter decides
 * what they do.
 *
 * This component is the shell. Each chapter (`lib/rocket/chapters/`) owns its
 * physics, its drawing and its words, behind one interface; the shell owns the
 * canvas, the button, the sound and the loop, and runs whichever chapter is
 * open. Every number in the working panel is computed from the same state the
 * drawing shows, and written straight into the DOM — through refs, not React
 * state, so sixty updates a second do not re-render the page.
 *
 * Reduced motion keeps everything the drawing tells you and drops the motion
 * that carries it: the pencil stops boiling, nothing shakes or flickers, and
 * the drawing moves on in steps twice a second instead of gliding.
 */

import { useEffect, useMemo, useReducer, useRef } from 'react';
import { prefersReducedMotion } from '@/lib/gsap';
import { holdLoader } from '@/lib/ready';
import { rocketChapters, rocketCopy } from '@/content/rocket';
import { CHAPTERS, type Chapter, type Tone } from '@/lib/rocket/chapters';
import { readPalette } from '@/lib/rocket/palette';
import { createRocketAudio, type RocketAudio } from '@/lib/rocket/audio';
import styles from './RocketPhysics.module.css';

type State = {
  chapter: number;
  isMuted: boolean;
  isAudioInitialized: boolean;
  firing: boolean;
};

type Action =
  | { type: 'chapter'; index: number }
  | { type: 'toggleMute' }
  | { type: 'audioReady' }
  | { type: 'firing'; value: boolean };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'chapter':
      return { ...state, chapter: Math.max(0, Math.min(rocketChapters.length - 1, action.index)) };
    case 'toggleMute':
      return { ...state, isMuted: !state.isMuted };
    case 'audioReady':
      return { ...state, isAudioInitialized: true };
    case 'firing':
      return state.firing === action.value ? state : { ...state, firing: action.value };
  }
}

const INITIAL: State = { chapter: 0, isMuted: false, isAudioInitialized: false, firing: false };

/** How often the words and numbers are rewritten, ms. Often enough to follow, not so often they blur. */
const NUMBERS_EVERY = 80;

export function RocketPhysics() {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const entryRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const buttonRef = useRef<HTMLSpanElement>(null);
  const values = useRef<Record<string, HTMLElement | null>>({});
  const engine = useRef(false);
  /** Presses and releases since the loop last looked, so a quick tap is never lost between frames. */
  const edges = useRef({ presses: 0, releases: 0 });
  const audio = useRef<RocketAudio | null>(null);
  const muted = useRef(state.isMuted);

  const copy = rocketChapters[state.chapter];
  // One run of the open chapter. Turning to another starts it afresh.
  const run: Chapter = useMemo(() => CHAPTERS[copy.id](), [copy.id]);

  /** Sound can only start inside a press, so the first press starts it. */
  const ensureAudio = () => {
    if (audio.current) {
      audio.current.resume();
      return;
    }
    const created = createRocketAudio(muted.current);
    if (created) {
      audio.current = created;
      dispatch({ type: 'audioReady' });
    }
  };

  const fire = (on: boolean) => {
    if (on) ensureAudio();
    if (engine.current === on) return;
    engine.current = on;
    if (on) edges.current.presses += 1;
    else edges.current.releases += 1;
    dispatch({ type: 'firing', value: on });
  };

  // Letting go anywhere cuts the engine. Listening on the window rather than
  // capturing the pointer, so nothing else on the page stops taking clicks.
  useEffect(() => {
    const stop = () => fire(false);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    window.addEventListener('blur', stop);
    return () => {
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
      window.removeEventListener('blur', stop);
    };
  }, []);

  useEffect(() => {
    muted.current = state.isMuted;
    audio.current?.setMuted(state.isMuted);
  }, [state.isMuted]);

  useEffect(() => {
    const onVisibility = () => (document.hidden ? audio.current?.suspend() : audio.current?.resume());
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      audio.current?.dispose();
      audio.current = null;
    };
  }, []);

  // The drawing, the chapter and the numbers: one loop.
  useEffect(() => {
    const entry = entryRef.current;
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!entry || !frame || !canvas || !ctx) return;

    const reduced = prefersReducedMotion();
    const pal = readPalette(entry);
    edges.current = { presses: 0, releases: 0 };

    // Three layers: the backdrop (washes, drawn once per size), the still
    // drawing over it (re-drawn when the pencil boils), and the moment (every
    // frame). The first two are composited into `still`, so a frame is one blit
    // and what moves.
    let dpr = 1;
    const backdrop = document.createElement('canvas');
    const still = document.createElement('canvas');
    let stillKey = '';
    let drawnAt = -Infinity;
    const size = () => {
      const { width, height } = frame.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = still.width = backdrop.width = Math.max(1, Math.round(width * dpr));
      canvas.height = still.height = backdrop.height = Math.max(1, Math.round(height * dpr));
      run.resize(width, height);
      const bctx = backdrop.getContext('2d');
      if (bctx) {
        bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        run.backdrop(bctx, pal);
      }
      stillKey = '';
      drawnAt = -Infinity;
    };
    size();
    const resize = new ResizeObserver(size);
    resize.observe(frame);
    void document.fonts?.ready.then(() => {
      stillKey = '';
    });

    let visible = true;
    const seen = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    seen.observe(frame);

    // The loader stays up until the drawing's first frame is on the canvas.
    const release = holdLoader();

    let lastEngine = -1;
    let lastNumbers = -Infinity;
    const started = performance.now();
    let last = started;
    let raf = 0;

    const write = () => {
      const status = statusRef.current;
      const text = run.status();
      if (status && status.textContent !== text) status.textContent = text;
      const button = buttonRef.current;
      const label = run.button();
      if (button && button.textContent !== label) button.textContent = label;
      const numbers = run.working();
      for (const key of Object.keys(numbers)) {
        const el = values.current[key];
        if (el && el.textContent !== numbers[key]) el.textContent = numbers[key];
      }
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const { presses, releases } = edges.current;
      edges.current = { presses: 0, releases: 0 };
      const sounds = run.step(dt, { held: engine.current, pressed: presses > 0, released: releases > 0 });
      for (const sound of sounds) {
        if (sound === 'chime') audio.current?.chime();
        else audio.current?.knock(sound);
      }

      // The engine is heard only while it is pushing.
      const level = run.engine();
      if (Math.abs(level - lastEngine) > 0.01) {
        lastEngine = level;
        audio.current?.setThrust(level);
      }

      if (now - lastNumbers > NUMBERS_EVERY) {
        lastNumbers = now;
        write();
      }

      // Out of view there is nothing to draw — and nothing for the loader to
      // wait for.
      if (!visible) {
        release();
        return;
      }
      // Reduced motion: the drawing moves on in steps, twice a second.
      if (reduced && now - drawnAt < 500) return;
      drawnAt = now;

      // The still layer, redrawn only when the pencil boils (ten times a second).
      const boil = reduced ? 0 : Math.floor((now - started) / 100);
      const key = `${canvas.width}x${canvas.height}:${boil}`;
      if (key !== stillKey) {
        const sctx = still.getContext('2d');
        if (sctx) {
          sctx.setTransform(1, 0, 0, 1, 0, 0);
          sctx.clearRect(0, 0, still.width, still.height);
          sctx.drawImage(backdrop, 0, 0);
          sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          run.still(sctx, pal, 1000 + boil * 31);
        }
        stillKey = key;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(still, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      run.moment(ctx, pal, { t: reduced ? 0 : (now - started) / 1000, seed: 3000 + boil * 17, reduced });
      release();
    };
    raf = requestAnimationFrame(tick);

    return () => {
      release();
      cancelAnimationFrame(raf);
      resize.disconnect();
      seen.disconnect();
      audio.current?.setThrust(0);
    };
  }, [run]);

  const onKey = (down: boolean) => (event: React.KeyboardEvent) => {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    if (down && event.repeat) return;
    fire(down);
  };

  const tone: Record<Tone, string> = { pull: styles.pull, push: styles.push, escape: styles.escape };
  // What the words and numbers say before the loop first writes them: the
  // chapter's opening state, so the page is complete without JavaScript too.
  const opening = run.working();

  return (
    <section className={styles.entry} ref={entryRef} aria-labelledby="rocket-chapter">
      <div className={styles.stage}>
        <div className={styles.side}>
          <header className={styles.chapterHead}>
            <p className={styles.chapterKicker}>
              {rocketCopy.chapter} {state.chapter + 1}
            </p>
            <h2 className={styles.chapterTitle} id="rocket-chapter">
              {copy.title}
            </h2>
            <p className={styles.lede}>{copy.lede}</p>
          </header>
          <div className={styles.panel}>
            <button
              type="button"
              className={styles.hold}
              data-firing={state.firing ? '' : undefined}
              data-cursor={rocketCopy.holdCursor}
              onPointerDown={() => fire(true)}
              onKeyDown={onKey(true)}
              onKeyUp={onKey(false)}
              onBlur={() => fire(false)}
              onContextMenu={(e) => e.preventDefault()}
            >
              <span ref={buttonRef}>{run.button()}</span>
            </button>
            <p className={styles.status} aria-live="polite" ref={statusRef}>
              {run.status()}
            </p>
            <dl className={styles.working}>
              {run.lines.map((line) => (
                <div key={line.key} className={`${styles.line}${line.tone ? ` ${tone[line.tone]}` : ''}`}>
                  <dt>{line.label}</dt>
                  <dd
                    ref={(el) => {
                      values.current[line.key] = el;
                    }}
                  >
                    {opening[line.key]}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className={styles.drawing}>
          <div className={styles.frame} ref={frameRef}>
            <canvas className={styles.canvas} ref={canvasRef} role="img" aria-label={copy.drawing} />
            <button
              type="button"
              className={styles.sound}
              aria-pressed={!state.isMuted}
              data-cursor={rocketCopy.sound}
              onClick={() => dispatch({ type: 'toggleMute' })}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
                {state.isMuted ? (
                  <path d="M16 9.5l5 5M21 9.5l-5 5" />
                ) : (
                  <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
                )}
              </svg>
              {rocketCopy.sound}
            </button>
          </div>

          <div className={styles.notes}>
            {copy.notes.map((note) => (
              <p key={note}>{note}</p>
            ))}
            {rocketCopy.glossary.map((note) => (
              <p key={note}>{note}</p>
            ))}
            <p className={styles.leavesOut}>{copy.keptSimple}</p>
          </div>
        </div>
      </div>

      <nav className={styles.deck} aria-label={rocketCopy.deck.label}>
        {state.chapter > 0 ? (
          <button type="button" className={styles.turn} onClick={() => dispatch({ type: 'chapter', index: state.chapter - 1 })}>
            ← {rocketCopy.deck.previous}
          </button>
        ) : (
          <span />
        )}
        <ol className={styles.tabs}>
          {rocketChapters.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                className={styles.tab}
                aria-current={i === state.chapter ? 'step' : undefined}
                onClick={() => dispatch({ type: 'chapter', index: i })}
              >
                {i + 1} · {c.title}
              </button>
            </li>
          ))}
        </ol>
        {state.chapter < rocketChapters.length - 1 ? (
          <button type="button" className={styles.turn} onClick={() => dispatch({ type: 'chapter', index: state.chapter + 1 })}>
            {rocketCopy.deck.next} →
          </button>
        ) : (
          <span />
        )}
      </nav>
    </section>
  );
}
