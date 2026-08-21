'use client';

/**
 * Mochi, taken apart.
 *
 * The same `Companion` class the page's companion runs on, mounted a second
 * time with its constants wired to sliders. Change stiffness and the character
 * on this section changes — it is not a recording of the character and not a
 * diagram of one.
 *
 * ---
 *
 * WHY THIS SECTION EXISTS
 *
 * "We do creative engineering" is a claim. A rig whose damping coefficient the
 * reader can drag to zero and watch oscillate forever is a demonstration, and
 * it takes about four seconds. The telemetry row is there for the same reason
 * the risk instrument prints its analytic check: the numbers move because they
 * are being integrated, and a reader who suspects a loop can watch the velocity
 * cross zero at the top of each bounce.
 *
 * ---
 *
 * ABOUT THE PRINTED SOURCE
 *
 * The code shown is an excerpt, transcribed — a build cannot hand a component
 * its own un-minified source, so `Function.prototype.toString` here would print
 * mangled names and no comments. What runs is the real import from
 * `lib/physics.ts`; the excerpt is the three lines at the centre of it, kept
 * short deliberately so there is little for a transcription to drift from. The
 * caption says so rather than implying the page is introspecting itself.
 */

import { useEffect, useRef, useState } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/gsap';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import {
  Companion as Rig,
  COMPANION_BOUNDS,
  type CompanionPalette,
  type CompanionPose,
} from '@/lib/companion';
import { StepDriver } from '@/lib/physics';

const POSES: { id: CompanionPose; label: string }[] = [
  { id: 'idle', label: 'Idle' },
  { id: 'wave', label: 'Wave' },
  { id: 'point', label: 'Point' },
  { id: 'think', label: 'Think' },
  { id: 'cheer', label: 'Cheer' },
];

const SPRING_SOURCE = `// lib/physics.ts — the integrator, in full
step(dt: number): number {
  const force = -this.stiffness * (this.value - this.target)
              -   this.damping * this.velocity;
  this.velocity += (force / this.mass) * dt;   // ← velocity first
  this.value    += this.velocity * dt;         // ← then position
  return this.value;
}`;

const IK_SOURCE = `// lib/companion.ts — the arm, every frame
const { elbow } = solveArm(
  shoulder,          // fixed on the torso
  hand,              // wherever the SPRING has got to
  GEO.upperArm,      // 50 units
  GEO.foreArm,       // 46 units
  flip,              // which way this elbow bends
);
// the pose moves a TARGET; the spring decides the path;
// the elbow is solved from wherever the hand actually is.`;

export function RigDemo() {
  const [stiffness, setStiffness] = useState(130);
  const [damping, setDamping] = useState(15);
  const [gravity, setGravity] = useState(9.81);
  const [pose, setPose] = useState<CompanionPose>('wave');
  const [telemetry, setTelemetry] = useState({ hover: 0, velocity: 0, antenna: 0 });
  const [reduced, setReduced] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rigRef = useRef<Rig | null>(null);

  useEffect(() => setReduced(prefersReducedMotion()), []);

  useIsomorphicLayoutEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rig = new Rig();
    rigRef.current = rig;
    const driver = new StepDriver();

    const css = getComputedStyle(document.documentElement);
    const token = (n: string, f: string) => css.getPropertyValue(n).trim() || f;
    const palette: CompanionPalette = {
      shell: token('--bg-raise', '#fbf8f1'),
      shellShade: token('--bg-sunk', '#e7e0d0'),
      visor: token('--fg', '#1a1714'),
      eye: token('--lantern', '#ffb865'),
      sash: token('--accent', '#c4402a'),
      ink: token('--fg', '#1a1714'),
      shadow: token('--fg', '#1a1714'),
    };

    let width = 0, height = 0, scale = 1, ox = 0, oy = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const bw = COMPANION_BOUNDS.maxX - COMPANION_BOUNDS.minX;
      const bh = COMPANION_BOUNDS.maxY - COMPANION_BOUNDS.minY;
      scale = Math.min(width / bw, height / bh) * 0.92;
      ox = width / 2;
      oy = height / 2 - ((COMPANION_BOUNDS.minY + COMPANION_BOUNDS.maxY) / 2) * scale;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let pointer: { x: number; y: number } | null = null;
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer = {
        x: (e.clientX - (rect.left + ox)) / scale,
        y: (e.clientY - (rect.top + oy)) / scale,
      };
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    let last = performance.now();
    let sinceReadout = 0;
    const frame = () => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.25);
      last = now;

      driver.advance(dt, (fixed) => rig.update(fixed, pointer, 0));

      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(scale, scale);
      rig.draw(ctx, palette);
      ctx.restore();

      // The readout is throttled to ~8Hz. At frame rate it is an unreadable
      // blur and it would re-render React sixty times a second for the sake of
      // three numbers.
      sinceReadout += dt;
      if (sinceReadout > 0.12) {
        sinceReadout = 0;
        setTelemetry(rig.telemetry);
      }
    };

    gsap.ticker.add(frame);
    return () => {
      gsap.ticker.remove(frame);
      observer.disconnect();
      window.removeEventListener('pointermove', onMove);
      rigRef.current = null;
    };
  }, [reduced]);

  // Constants pushed into the live rig whenever a slider moves.
  useEffect(() => {
    rigRef.current?.configure({ stiffness, damping, gravity });
  }, [stiffness, damping, gravity]);

  useEffect(() => {
    rigRef.current?.setPose(pose);
  }, [pose]);

  return (
    <div className="rig">
      <div className="rig__stage">
        {reduced ? (
          <p className="rig__reduced">
            The rig runs on a continuous animation loop, so it is paused while
            your system asks for reduced motion. The source below is what it
            runs — a damped harmonic oscillator per degree of freedom, and
            analytic two-bone inverse kinematics for each arm.
          </p>
        ) : (
          <canvas ref={canvasRef} className="rig__canvas" aria-hidden="true" />
        )}
      </div>

      <div className="rig__panel">
        <span className="mono-label">Constants — live</span>

        <Slider
          label="stiffness"
          value={stiffness}
          min={10}
          max={400}
          step={1}
          onChange={setStiffness}
          hint="How hard each spring pulls toward its target."
        />
        <Slider
          label="damping"
          value={damping}
          min={0}
          max={40}
          step={0.5}
          onChange={setDamping}
          hint="Take it to zero and nothing ever settles."
        />
        <Slider
          label="gravity"
          value={gravity}
          min={0}
          max={30}
          step={0.1}
          onChange={setGravity}
          hint="Applies to the antenna pendulum only."
        />

        <div className="rig__poses">
          <span className="mono-label">Pose</span>
          <div className="rig__pose-row">
            {POSES.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`rig__pose${pose === p.id ? ' is-active' : ''}`}
                onClick={() => setPose(p.id)}
                aria-pressed={pose === p.id}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <dl className="rig__telemetry">
          <div>
            <dt className="mono-label">hover.value</dt>
            <dd>{telemetry.hover.toFixed(2)}</dd>
          </div>
          <div>
            <dt className="mono-label">hover.velocity</dt>
            <dd>{telemetry.velocity.toFixed(2)}</dd>
          </div>
          <div>
            <dt className="mono-label">antenna θ</dt>
            <dd>{telemetry.antenna.toFixed(1)}°</dd>
          </div>
        </dl>
      </div>

      <div className="rig__code">
        <figure>
          <figcaption className="mono-label">The integrator</figcaption>
          <pre><code>{SPRING_SOURCE}</code></pre>
          <p>
            Semi-implicit Euler — velocity updated first, position from the{' '}
            <em>new</em> velocity. Swap those two lines and a lightly damped
            spring gains energy every step until it leaves the screen. It is one
            line, and it is the line that decides whether any of this is stable.
          </p>
        </figure>
        <figure>
          <figcaption className="mono-label">The arm</figcaption>
          <pre><code>{IK_SOURCE}</code></pre>
          <p>
            Nothing animates an arm. A pose moves the hand&rsquo;s <em>target</em>,
            a spring takes its own path there, and the elbow is solved by the law
            of cosines from wherever the hand actually got to this frame. That is
            why an interrupted wave carries its momentum into the next gesture
            instead of snapping.
          </p>
        </figure>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  hint: string;
}) {
  return (
    <label className="rig__slider">
      <span className="rig__slider-head">
        <code>{label}</code>
        <output>{value.toFixed(step < 1 ? 2 : 0)}</output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <small>{hint}</small>
    </label>
  );
}
