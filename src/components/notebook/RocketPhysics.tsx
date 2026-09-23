'use client';

/**
 * Rocket physics: one trip, from the launch pad to the Moon, with the booster
 * flying home to be caught — played back from a flight flown once, in full,
 * by the physics in `lib/rocket/mission/`.
 *
 * This component is the player. It flies the mission while the loader is up,
 * then plays it back: one button (lift off, pause, play, watch again), a
 * mission clock, a split view for the booster, a strip of the trip's steps to
 * jump between, and the working for whatever is happening. Every number on it
 * is computed from the same flight the drawing shows, and written straight
 * into the DOM — through refs, not React state, so sixty updates a second do
 * not re-render the page.
 *
 * Reduced motion keeps everything the drawing tells you and drops the motion
 * that carries it: the pencil stops boiling, the camera cuts instead of
 * gliding, and the drawing moves on in steps twice a second.
 */

import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '@/lib/gsap';
import { holdLoader } from '@/lib/ready';
import { rocketCopy } from '@/content/rocket';
import { flyMission, type EventId, type Mission } from '@/lib/rocket/mission/mission';
import { timelineFor } from '@/lib/rocket/mission/timeline';
import { GROUPS, groupAt, statusAt, workingAt, type Group, type Tone } from '@/lib/rocket/mission/readout';
import { boosterCamera, cameraAt, renderBooster, renderMain, shotsFor } from '@/lib/rocket/scene/render';
import { readPalette } from '@/lib/rocket/palette';
import { createRocketAudio, type RocketAudio } from '@/lib/rocket/audio';
import * as fmt from '@/lib/rocket/format';
import styles from './RocketPhysics.module.css';

type Mode = 'ready' | 'playing' | 'paused' | 'done';

/** Moments that make a sound as the playback passes them. */
const SOUNDS: [EventId, 'chime' | 'clunk'][] = [
  ['separation', 'clunk'],
  ['caught', 'clunk'],
  ['orbit', 'chime'],
  ['docked', 'clunk'],
  ['touchdown', 'chime'],
];

/** How often the words and numbers are rewritten, ms. */
const WORDS_EVERY = 100;

const WORDS = { heights: rocketCopy.heights, earth: rocketCopy.earth, moon: rocketCopy.moon, arrows: rocketCopy.arrows };

export function RocketPhysics() {
  const [mode, setMode] = useState<Mode>('ready');
  const [group, setGroup] = useState<Group>('launch');
  const [step, setStep] = useState(-1);
  const [isMuted, setMuted] = useState(false);
  const [mission, setMission] = useState<Mission | null>(null);

  const entryRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const insetRef = useRef<HTMLDivElement>(null);
  const insetCanvasRef = useRef<HTMLCanvasElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const clockRef = useRef<HTMLParagraphElement>(null);
  const values = useRef<Record<string, HTMLElement | null>>({});
  /** Playback seconds, and whether it is running: read by the loop, set by the controls. */
  const playback = useRef({ p: 0, running: false, started: false });
  const audio = useRef<RocketAudio | null>(null);
  const muted = useRef(isMuted);

  // Fly the trip once, while the loader is up.
  useEffect(() => {
    const release = holdLoader();
    const id = window.setTimeout(() => {
      setMission(flyMission());
      release();
    }, 0);
    return () => {
      window.clearTimeout(id);
      release();
    };
  }, []);

  useEffect(() => {
    muted.current = isMuted;
    audio.current?.setMuted(isMuted);
  }, [isMuted]);

  useEffect(() => {
    const onVisibility = () => (document.hidden ? audio.current?.suspend() : audio.current?.resume());
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      audio.current?.dispose();
      audio.current = null;
    };
  }, []);

  /** Sound can only start inside a press, so the first press starts it. */
  const ensureAudio = () => {
    if (audio.current) {
      audio.current.resume();
      return;
    }
    audio.current = createRocketAudio(muted.current);
  };

  const run = (from?: number) => {
    ensureAudio();
    const pb = playback.current;
    if (from !== undefined) pb.p = from;
    pb.running = true;
    pb.started = true;
    setMode('playing');
  };

  const press = () => {
    const pb = playback.current;
    if (mode === 'playing') {
      pb.running = false;
      setMode('paused');
    } else if (mode === 'done') run(0);
    else run();
  };

  // The loop: the clock, the camera, the drawing and the words.
  useEffect(() => {
    const entry = entryRef.current;
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    const insetCanvas = insetCanvasRef.current;
    const inset = insetRef.current;
    const ctx = canvas?.getContext('2d');
    const ictx = insetCanvas?.getContext('2d');
    if (!mission || !entry || !frame || !canvas || !ctx || !insetCanvas || !ictx || !inset) return;

    const reduced = prefersReducedMotion();
    const pal = readPalette(entry);
    const tl = timelineFor(mission);
    const e = mission.events;
    let w = 1;
    let h = 1;
    let dpr = 1;
    let shots = shotsFor(mission, tl, w, h);
    const size = () => {
      const rect = frame.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      const ir = insetCanvas.getBoundingClientRect();
      insetCanvas.width = Math.max(1, Math.round(ir.width * dpr));
      insetCanvas.height = Math.max(1, Math.round(ir.height * dpr));
      shots = shotsFor(mission, tl, w, h);
      drawnAt = -Infinity;
    };
    let drawnAt = -Infinity;
    size();
    const resize = new ResizeObserver(size);
    resize.observe(frame);

    let visible = true;
    const seen = new IntersectionObserver(([entryState]) => {
      visible = entryState.isIntersecting;
    });
    seen.observe(frame);

    const release = holdLoader();
    const started = performance.now();
    let last = started;
    let lastWords = -Infinity;
    let lastT = 0;
    let lastEngine = -1;
    let shownGroup: Group = 'launch';
    let shownStep = -1;
    let raf = 0;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const pb = playback.current;
      if (pb.running) {
        pb.p = Math.min(tl.length, pb.p + dt);
        if (pb.p >= tl.length) {
          pb.running = false;
          setMode('done');
        }
      }
      const t = pb.started ? tl.missionAt(pb.p) : 0;

      // Sounds for the moments just passed, and the engines while they burn.
      if (pb.running && t > lastT) {
        for (const [id, sound] of SOUNDS) if (lastT < e[id] && t >= e[id]) sound === 'chime' ? audio.current?.chime() : audio.current?.knock(sound);
      }
      lastT = t;
      const engine = pb.running ? Math.max(shipThrottle(t), t > e.separation && t < e.caught ? boosterThrottle(t) * 0.7 : 0) : 0;
      if (Math.abs(engine - lastEngine) > 0.01) {
        lastEngine = engine;
        audio.current?.setThrust(engine);
      }

      if (now - lastWords > WORDS_EVERY) {
        lastWords = now;
        const status = statusAt(mission, t, pb.started);
        if (statusRef.current && statusRef.current.textContent !== status) statusRef.current.textContent = status;
        const clock = rocketCopy.clock(fmt.clock(t));
        if (clockRef.current && clockRef.current.textContent !== clock) clockRef.current.textContent = clock;
        const g = groupAt(mission, t);
        if (g !== shownGroup) {
          shownGroup = g;
          setGroup(g);
        }
        const numbers = workingAt(mission, t);
        for (const key of Object.keys(numbers)) {
          const el = values.current[key];
          if (el && el.textContent !== numbers[key]) el.textContent = numbers[key];
        }
        let s = -1;
        rocketCopy.phases.forEach((ph, i) => {
          if (pb.started && t >= e[ph.at]) s = i;
        });
        if (s !== shownStep) {
          shownStep = s;
          setStep(s);
        }
      }

      if (!visible) {
        release();
        return;
      }
      if (reduced && now - drawnAt < 500) return;
      drawnAt = now;

      const boil = reduced ? 0 : Math.floor((now - started) / 100);
      const seed = 1000 + boil * 31;
      const flicker = reduced ? 0 : (now - started) / 1000;

      const cam = cameraAt(shots, pb.p, t, reduced);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderMain(ctx, { ...cam, w, h }, pal, mission, t, WORDS, seed, flicker, pb.started);

      // The split view, while the booster is on its way home and a moment after.
      const showInset = pb.started && t >= e.separation && t < e.caught + 25;
      inset.dataset.shown = showInset ? 'true' : 'false';
      if (showInset) {
        const iw = insetCanvas.width / dpr;
        const ih = insetCanvas.height / dpr;
        ictx.setTransform(1, 0, 0, 1, 0, 0);
        ictx.clearRect(0, 0, insetCanvas.width, insetCanvas.height);
        ictx.setTransform(dpr, 0, 0, dpr, 0, 0);
        renderBooster(ictx, { ...boosterCamera(mission, t, iw, ih), w: iw, h: ih }, pal, mission, t, WORDS, seed + 7, flicker);
      }
      release();
    };

    const shipThrottle = (t: number) => {
      const s = mission.ship;
      let i = 0;
      let j = s.length - 1;
      while (j - i > 1) {
        const k = (i + j) >> 1;
        if (s[k].t <= t) i = k;
        else j = k;
      }
      return s[i].throttle;
    };
    const boosterThrottle = (t: number) => {
      const s = mission.booster;
      let i = 0;
      let j = s.length - 1;
      while (j - i > 1) {
        const k = (i + j) >> 1;
        if (s[k].t <= t) i = k;
        else j = k;
      }
      return s[i].throttle;
    };

    raf = requestAnimationFrame(tick);
    return () => {
      release();
      cancelAnimationFrame(raf);
      resize.disconnect();
      seen.disconnect();
      audio.current?.setThrust(0);
    };
  }, [mission]);

  const jump = (at: EventId) => {
    if (!mission) return;
    const tl = timelineFor(mission);
    run(Math.max(0, tl.playbackAt(mission.events[at]) - 0.3));
  };

  const tone: Record<Tone, string> = { pull: styles.pull, push: styles.push, escape: styles.escape };
  const opening = mission ? workingAt(mission, 0) : {};
  const label = rocketCopy.button[mode];

  return (
    <section className={styles.entry} ref={entryRef} aria-labelledby="rocket-trip">
      <div className={styles.stage}>
        <div className={styles.side}>
          <header className={styles.chapterHead}>
            <h2 className={styles.chapterTitle} id="rocket-trip">
              {rocketCopy.title}
            </h2>
            <p className={styles.lede}>{rocketCopy.lede}</p>
          </header>
          <div className={styles.panel}>
            <button
              type="button"
              className={styles.hold}
              data-firing={mode === 'playing' ? '' : undefined}
              data-cursor={rocketCopy.cursor}
              disabled={!mission}
              onClick={press}
            >
              {label}
            </button>
            <p className={styles.status} aria-live="polite" ref={statusRef}>
              {rocketCopy.beats.ready}
            </p>
            <dl className={styles.working}>
              {GROUPS[group].map((line) => (
                <div key={`${group}-${line.key}`} className={`${styles.line}${'tone' in line && line.tone ? ` ${tone[line.tone]}` : ''}`}>
                  <dt>{line.label}</dt>
                  <dd
                    ref={(el) => {
                      values.current[line.key] = el;
                    }}
                  >
                    {opening[line.key] ?? ''}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className={styles.drawing}>
          <div className={styles.frame} ref={frameRef}>
            <canvas className={styles.canvas} ref={canvasRef} role="img" aria-label={rocketCopy.drawing} />
            <div className={styles.inset} ref={insetRef} data-shown="false" aria-hidden="true">
              <canvas className={styles.canvas} ref={insetCanvasRef} />
              <p className={styles.insetLabel}>{rocketCopy.split}</p>
            </div>
            <p className={styles.clock} ref={clockRef}>
              {rocketCopy.clock(fmt.clock(0))}
            </p>
            <button
              type="button"
              className={styles.sound}
              aria-pressed={!isMuted}
              data-cursor={rocketCopy.sound}
              onClick={() => setMuted((m) => !m)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
                {isMuted ? <path d="M16 9.5l5 5M21 9.5l-5 5" /> : <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />}
              </svg>
              {rocketCopy.sound}
            </button>
          </div>

          <nav className={styles.deck} aria-label={rocketCopy.steps}>
            <ol className={styles.tabs}>
              {rocketCopy.phases.map((ph, i) => (
                <li key={ph.at}>
                  <button
                    type="button"
                    className={styles.tab}
                    aria-current={i === step ? 'step' : undefined}
                    disabled={!mission}
                    onClick={() => jump(ph.at)}
                  >
                    {ph.label}
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <div className={styles.notes}>
            {rocketCopy.notes.map((note) => (
              <p key={note}>{note}</p>
            ))}
            {rocketCopy.glossary.map((note) => (
              <p key={note}>{note}</p>
            ))}
            <p className={styles.leavesOut}>{rocketCopy.keptSimple}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
