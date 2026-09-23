'use client';

/**
 * Rocket physics, for kids: hold a button, fire a rocket, and watch gravity
 * decide whether it comes back.
 *
 * The physics is `lib/rocket/physics.ts`; this component runs it, draws it
 * (`lib/rocket/draw.ts`) and sounds it (`lib/rocket/audio.ts`). Every number
 * in the working panel is computed from the same state the drawing shows, and
 * written straight into the DOM on each frame — through refs, not React state,
 * so sixty updates a second do not re-render the page.
 *
 * Reduced motion keeps everything the drawing tells you and drops the motion
 * that carries it: the pencil stops boiling, the rocket does not shake, and it
 * moves up the page in steps twice a second instead of gliding.
 */

import { useEffect, useReducer, useRef } from 'react';
import { prefersReducedMotion } from '@/lib/gsap';
import { rocketChapters, rocketCopy } from '@/content/rocket';
import {
  advance,
  distanceFromCentre,
  escapeSpeedAt,
  gravityAt,
  onThePad,
  ROCKET,
  thrustOf,
  weightAt,
  wouldEscape,
  type Flight,
} from '@/lib/rocket/physics';
import { drawBackdrop, drawMoment, drawStill, EXIT_HEIGHT, heightToY, layoutFor, PALETTE_VARS, type Layout, type Palette } from '@/lib/rocket/draw';
import { createRocketAudio, type RocketAudio } from '@/lib/rocket/audio';
import * as fmt from '@/lib/rocket/format';
import styles from './RocketPhysics.module.css';

type Phase = keyof typeof rocketCopy.status;

type State = {
  chapter: number;
  isMuted: boolean;
  isAudioInitialized: boolean;
  phase: Phase;
  firing: boolean;
};

type Action =
  | { type: 'chapter'; index: number }
  | { type: 'toggleMute' }
  | { type: 'audioReady' }
  | { type: 'phase'; phase: Phase }
  | { type: 'firing'; value: boolean };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'chapter':
      return { ...state, chapter: Math.max(0, Math.min(rocketChapters.length - 1, action.index)) };
    case 'toggleMute':
      return { ...state, isMuted: !state.isMuted };
    case 'audioReady':
      return { ...state, isAudioInitialized: true };
    case 'phase':
      return state.phase === action.phase ? state : { ...state, phase: action.phase };
    case 'firing':
      return state.firing === action.value ? state : { ...state, firing: action.value };
  }
}

const INITIAL: State = { chapter: 0, isMuted: false, isAudioInitialized: false, phase: 'ready', firing: false };

type Working = Record<'weight' | 'thrust' | 'net' | 'escape' | 'motion', string>;

/** The working panel's lines for a moment of flight — each with the numbers put in. */
function working(f: Flight): Working {
  const w = rocketCopy.working;
  const g = gravityAt(f.height);
  const weight = weightAt(f.height);
  const thrust = thrustOf(f);
  const net = thrust - weight;
  const escape = escapeSpeedAt(f.height);
  const held = f.onPad && net <= 0 ? ` — ${w.padHolds}` : '';
  const verdict = f.onPad ? '' : `, ${wouldEscape(f.height, f.speed) ? w.faster : w.slower}`;
  return {
    weight: `${fmt.kilograms(ROCKET.mass)} × ${fmt.gravity(g)} = ${fmt.kilonewtons(weight)}`,
    thrust: `${fmt.kilonewtons(thrust)} (${fmt.kilonewtons(ROCKET.maxThrust)} ${w.fullPower})`,
    net: `${fmt.kilonewtons(thrust)} − ${fmt.kilonewtons(weight)} = ${fmt.kilonewtons(Math.abs(net))} ${net >= 0 ? w.up : w.down}${held}`,
    escape: `√(2 × ${fmt.gravity(g)} × ${fmt.metres(distanceFromCentre(f.height))}) = ${fmt.speed(escape)}`,
    motion: `${fmt.speed(f.speed)}${Math.abs(f.speed) < 0.5 ? '' : ` ${f.speed < 0 ? w.down : w.up}`} · ${fmt.height(f.height)}${verdict}`,
  };
}

const ON_THE_PAD = working(onThePad());

export function RocketPhysics() {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const entryRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lines = useRef<Partial<Record<keyof Working, HTMLElement | null>>>({});
  const engine = useRef(false);
  const audio = useRef<RocketAudio | null>(null);
  const muted = useRef(state.isMuted);

  const chapter = rocketChapters[state.chapter];

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

  // The drawing, the flight and the numbers: one loop.
  useEffect(() => {
    const entry = entryRef.current;
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!entry || !frame || !canvas || !ctx) return;

    const reduced = prefersReducedMotion();
    const own = getComputedStyle(entry);
    const root = getComputedStyle(document.documentElement);
    const pal = {
      charcoal: root.getPropertyValue('--fg').trim(),
      muted: root.getPropertyValue('--muted').trim(),
      paper: root.getPropertyValue('--bg-raise').trim(),
      hand: root.getPropertyValue('--font-hand').trim() || 'cursive',
      ...Object.fromEntries(Object.entries(PALETTE_VARS).map(([key, name]) => [key, own.getPropertyValue(name).trim()])),
    } as Palette;

    // Three layers: the backdrop (washes, drawn once per size), the still
    // drawing over it (re-drawn when the pencil boils), and the moment (every
    // frame). The first two are composited into `still`, so a frame is one blit
    // and the rocket.
    let L: Layout = layoutFor(1, 1);
    let dpr = 1;
    const backdrop = document.createElement('canvas');
    const still = document.createElement('canvas');
    let stillKey = '';
    const size = () => {
      const { width, height } = frame.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = still.width = backdrop.width = Math.max(1, Math.round(width * dpr));
      canvas.height = still.height = backdrop.height = Math.max(1, Math.round(height * dpr));
      L = layoutFor(width, height);
      const bctx = backdrop.getContext('2d');
      if (bctx) {
        bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawBackdrop(bctx, L, pal);
      }
      stillKey = '';
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

    let flight = onThePad();
    let escaped = false;
    let gone = false;
    let landedAt: number | null = null;
    let highest: number | null = null;
    let phase: Phase = 'ready';
    let wasOn = false;
    let lastThrottle = -1;
    let lastNumbers = 0;
    let shownHeight = 0;
    let lastShown = 0;
    const started = performance.now();
    let last = started;
    let raf = 0;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const on = engine.current;
      const pressed = on && !wasOn;
      wasOn = on;

      // A new press draws a fresh rocket once the last one has gone or come
      // down. A new press, not a held one: holding on while the rocket leaves
      // the top of the page must not replace it before its escape is seen.
      if (pressed && (gone || landedAt !== null)) {
        flight = onThePad();
        escaped = false;
        gone = false;
        landedAt = null;
      }
      if (!gone) {
        flight = advance(flight, dt, on);
        if (flight.touchdownSpeed !== null) {
          landedAt = now;
          highest = flight.highest;
        }
      }
      if (landedAt !== null && now - landedAt > 1600) landedAt = null;
      if (!escaped && wouldEscape(flight.height, flight.speed) && (!on || flight.height > EXIT_HEIGHT)) escaped = true;
      if (escaped && flight.height > EXIT_HEIGHT) gone = true;

      const next: Phase = escaped
        ? 'escaped'
        : landedAt !== null
          ? 'landed'
          : flight.onPad
            ? on
              ? 'straining'
              : 'ready'
            : on
              ? wouldEscape(flight.height, flight.speed)
                ? 'fastEnough'
                : 'climbing'
              : flight.speed < 0
                ? 'falling'
                : flight.height > EXIT_HEIGHT
                  ? 'above'
                  : 'coasting';
      if (next !== phase) {
        phase = next;
        dispatch({ type: 'phase', phase: next });
        if (next === 'escaped') audio.current?.chime();
      }

      // The engine is heard only while there is a rocket to hear.
      const audible = gone ? 0 : flight.throttle;
      if (Math.abs(audible - lastThrottle) > 0.01) {
        lastThrottle = audible;
        audio.current?.setThrust(audible);
      }

      if (now - lastNumbers > 80) {
        lastNumbers = now;
        const text = working(flight);
        (Object.keys(text) as (keyof Working)[]).forEach((key) => {
          const el = lines.current[key];
          if (el && el.textContent !== text[key]) el.textContent = text[key];
        });
      }

      if (!visible) return;

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
          drawStill(sctx, L, pal, 1000 + boil * 31, rocketCopy.landmarks);
        }
        stillKey = key;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(still, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (!reduced || now - lastShown > 500) {
        shownHeight = gone ? EXIT_HEIGHT * 4 : flight.height;
        lastShown = now;
      }
      const shake = reduced ? 0 : (Math.random() - 0.5) * 2 * flight.throttle * (flight.onPad ? 2.6 : 0.8);
      drawMoment(ctx, L, pal, {
        baseY: heightToY(L, shownHeight),
        shake,
        throttle: flight.throttle,
        onPad: flight.onPad,
        thrust: thrustOf(flight),
        weight: weightAt(flight.height),
        fullThrust: ROCKET.maxThrust,
        pushLabel: rocketCopy.arrows.push,
        pullLabel: rocketCopy.arrows.pull,
        t: reduced ? 0 : (now - started) / 1000,
        seed: 3000 + boil * 17,
        sinceLanding: landedAt === null || reduced ? null : (now - landedAt) / 1000,
        highest,
        highestLabel: highest === null ? '' : `${rocketCopy.highest} · ${fmt.height(highest)}`,
        trail: !flight.onPad || gone,
      });
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      seen.disconnect();
    };
  }, []);

  const onKey = (down: boolean) => (event: React.KeyboardEvent) => {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    if (down && event.repeat) return;
    fire(down);
  };

  const line = (key: keyof Working, className?: string) => (
    <div className={`${styles.line}${className ? ` ${className}` : ''}`}>
      <dt>{rocketCopy.working[key]}</dt>
      <dd
        ref={(el) => {
          lines.current[key] = el;
        }}
      >
        {ON_THE_PAD[key]}
      </dd>
    </div>
  );

  return (
    <section className={styles.entry} ref={entryRef} aria-labelledby="rocket-chapter">
      <div className={styles.stage}>
        <header className={styles.chapterHead}>
          <p className={styles.chapterKicker}>
            {rocketCopy.chapter} {state.chapter + 1}
          </p>
          <h2 className={styles.chapterTitle} id="rocket-chapter">
            {chapter.title}
          </h2>
          <p className={styles.lede}>{chapter.lede}</p>
        </header>

        <div className={styles.frame} ref={frameRef}>
          <canvas className={styles.canvas} ref={canvasRef} role="img" aria-label={rocketCopy.drawing} />
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
            {rocketCopy.hold}
          </button>
          <p className={styles.status} aria-live="polite">
            {rocketCopy.status[state.phase]}
          </p>
          <dl className={styles.working}>
            {line('weight', styles.pull)}
            {line('thrust', styles.push)}
            {line('net')}
            {line('escape', styles.escape)}
            {line('motion')}
          </dl>
        </div>
      </div>

      <div className={styles.notes}>
        {rocketCopy.glossary.map((note) => (
          <p key={note}>{note}</p>
        ))}
        <p className={styles.leavesOut}>{rocketCopy.leavesOut}</p>
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
            <li key={c.title}>
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
