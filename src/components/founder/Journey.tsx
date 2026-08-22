'use client';

/**
 * The career as a side-scrolling walk.
 *
 * Each role is a platform. Scrolling drives a character across them, and the
 * jumps between are real ballistic arcs — launch velocity solved so the
 * projectile lands exactly on the far platform under constant gravity
 * (`lib/journey.ts`).
 *
 * ---
 *
 * WHY THIS AND NOT A TIMELINE
 *
 * A vertical timeline is what every CV site does, and it says nothing except
 * that time passed. This says something the data actually contains: the walk
 * climbs, so the shape of the line IS the shape of the career, and a reader
 * takes that in before reading a single role.
 *
 * It also belongs to this site rather than to a template. The board, the
 * companion and the loader are all the same object seen from different angles;
 * a stock timeline in the middle of them would be the one page that came from
 * somewhere else.
 *
 * ---
 *
 * THE POSITION IS A PURE FUNCTION OF SCROLL
 *
 * `poseAt(distance)` integrates nothing and keeps no state, so scrubbing
 * backwards retraces the identical path and a mid-jump reload lands in exactly
 * the right place. A stateful simulation would drift under scrubbing and need
 * resetting, which is the usual reason scroll-driven animation feels unreliable.
 *
 * ---
 *
 * REDUCED MOTION
 *
 * No canvas, no pinning, no scrubbing. The roles are rendered as an ordinary
 * ordered list with every date, achievement and technology present — which is
 * the information the walk is decorating, and a CV that only exists as an
 * animation is not a CV.
 */

import { useRef, useState } from 'react';
import { gsap, ScrollTrigger, prefersReducedMotion } from '@/lib/gsap';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import {
  journeyCeiling,
  journeyLength,
  layout,
  poseAt,
  type Platform,
} from '@/lib/journey';
import { faceCells, FACE_SIZE } from '@/lib/face';
import { career } from '@/content/founder';

/**
 * Scope, which decides platform height.
 *
 * Derived from the record rather than typed in: a role's height is its position
 * counted from the earliest, so the walk always climbs toward the present and
 * cannot disagree with the list beside it. Career data is authored newest-first,
 * hence the reverse.
 */
const ROLES = [...career].reverse().map((entry, i) => ({
  id: entry.index,
  label: entry.org,
  detail: entry.role,
  scope: i,
}));

const PLATFORMS: Platform[] = layout(ROLES);
const LENGTH = journeyLength(PLATFORMS);
const CEILING = journeyCeiling(PLATFORMS);

/** World units of headroom above the highest point, and floor below the lowest. */
const HEAD = 150;
const FLOOR = 120;

export function Journey() {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [reduced, setReduced] = useState(false);
  const [active, setActive] = useState(0);

  useIsomorphicLayoutEffect(() => {
    const el = root.current;
    const stageEl = stage.current;
    const canvas = canvasRef.current;
    if (!el || !stageEl || !canvas) return;

    const low = prefersReducedMotion();
    setReduced(low);
    if (low) return;

    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;

    const css = getComputedStyle(document.documentElement);
    const token = (n: string, f: string) => css.getPropertyValue(n).trim() || f;
    const ink = token('--fg', '#14161a');
    const accent = token('--accent', '#1b4fe0');
    const line = token('--line-strong', 'rgba(20,22,26,.24)');
    const paper = token('--bg', '#eceae4');

    let width = 0;
    let height = 0;
    let progress = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };

    /** World y (up-positive, 0 at the baseline) to screen y. */
    const worldHeight = CEILING + HEAD + FLOOR;
    const toScreen = (worldY: number) => {
      const scale = height / worldHeight;
      return height - FLOOR * scale - worldY * scale;
    };
    const scaleOf = () => height / worldHeight;

    function draw() {
      if (!ctx2d) return;
      const scale = scaleOf();
      const pose = poseAt(PLATFORMS, progress * LENGTH);

      // The camera follows the character, holding it a third of the way in —
      // enough of the road behind to give the walk direction, enough ahead to
      // show where it is going.
      const camX = pose.x - width / scale / 3;

      ctx2d.clearRect(0, 0, width, height);
      const wx = (x: number) => (x - camX) * scale;

      /* ---- the ground line ---- */
      ctx2d.strokeStyle = line;
      ctx2d.lineWidth = 1;
      ctx2d.beginPath();
      ctx2d.moveTo(0, toScreen(0) + 0.5);
      ctx2d.lineTo(width, toScreen(0) + 0.5);
      ctx2d.stroke();

      /* ---- platforms ---- */
      PLATFORMS.forEach((p, i) => {
        const x = wx(p.x);
        const w = p.width * scale;
        if (x + w < -80 || x > width + 80) return;

        const top = toScreen(p.y);
        const isHere = i === pose.index;

        // A leg down to the ground, so a platform reads as standing on
        // something rather than floating.
        ctx2d.strokeStyle = line;
        ctx2d.beginPath();
        ctx2d.moveTo(Math.round(x + w / 2) + 0.5, top);
        ctx2d.lineTo(Math.round(x + w / 2) + 0.5, toScreen(0));
        ctx2d.stroke();

        ctx2d.fillStyle = isHere ? accent : ink;
        ctx2d.fillRect(Math.round(x), Math.round(top), Math.round(w), 6);

        ctx2d.fillStyle = isHere ? accent : ink;
        ctx2d.font = '600 15px var(--font-display), sans-serif';
        ctx2d.fillText(p.label, Math.round(x), Math.round(top) - 22);
        ctx2d.fillStyle = token('--muted', '#767a82');
        ctx2d.font = '11px var(--font-mono), monospace';
        ctx2d.fillText(p.detail, Math.round(x), Math.round(top) - 8);
      });

      /* ---- the character ---- */
      const px = Math.max(2, Math.round(3 * scale));
      const size = FACE_SIZE * px;
      const cx = wx(pose.x) - size / 2;
      const cy = toScreen(pose.y) - size - 4;

      // Airborne, the sprite leans into its vertical velocity — rising it tucks
      // up, falling it stretches. Squash and stretch, taken from the actual
      // velocity rather than from a keyframe.
      const lean = pose.airborne ? Math.max(-0.16, Math.min(0.16, pose.vy / 2600)) : 0;
      // Walking, a small bob at a rate tied to distance covered, so the step
      // rate matches the speed instead of running on a clock.
      const bob = pose.airborne ? 0 : Math.abs(Math.sin(pose.x / 26)) * px * 1.4;

      ctx2d.save();
      ctx2d.translate(cx + size / 2, cy + size / 2 + bob);
      ctx2d.scale(1 - lean, 1 + lean);
      ctx2d.translate(-size / 2, -size / 2);
      ctx2d.fillStyle = ink;
      for (const cell of faceCells(pose.airborne ? 'delighted' : 'pleased')) {
        ctx2d.fillRect(cell.x * px, cell.y * px, px, px);
      }
      ctx2d.restore();

      // A contact shadow that shrinks with height above its platform, which is
      // the only cue that says the character is airborne rather than higher up.
      const lift = pose.airborne ? Math.abs(pose.y - PLATFORMS[pose.index].y) : 0;
      ctx2d.globalAlpha = Math.max(0.06, 0.22 - lift / 900);
      ctx2d.fillStyle = ink;
      ctx2d.beginPath();
      ctx2d.ellipse(
        wx(pose.x),
        toScreen(PLATFORMS[pose.index].y) + 3,
        Math.max(6, size * 0.4 - lift * 0.05),
        4,
        0,
        0,
        Math.PI * 2,
      );
      ctx2d.fill();
      ctx2d.globalAlpha = 1;

      ctx2d.fillStyle = paper;
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top top',
        end: 'bottom bottom',
        pin: stageEl,
        pinSpacing: false,
        scrub: 0.5,
        onUpdate: (self) => {
          progress = self.progress;
          draw();
          const pose = poseAt(PLATFORMS, progress * LENGTH);
          setActive(pose.index);
        },
      });
    }, el);

    ScrollTrigger.refresh();

    return () => {
      ctx.revert();
      observer.disconnect();
    };
  }, []);

  const currentRole = career[career.length - 1 - active] ?? career[0];

  if (reduced) {
    // The information without the walk. A CV that only exists as an animation
    // is not a CV.
    return (
      <section className="journey journey--static">
        <ol className="journey__list">
          {career.map((entry) => (
            <li key={entry.index}>
              <span className="mono-label">{entry.period}</span>
              <h3>
                {entry.role} — {entry.org}
              </h3>
              <p>{entry.summary}</p>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  return (
    <section className="journey" ref={root}>
      <div className="journey__stage" ref={stage}>
        <canvas className="journey__canvas" ref={canvasRef} aria-hidden="true" />

        <aside className="journey__card" aria-live="polite">
          <span className="mono-label journey__period">{currentRole.period}</span>
          <h3 className="journey__role">{currentRole.role}</h3>
          <p className="journey__org">
            {currentRole.org} · {currentRole.location}
          </p>
          <p className="journey__summary">{currentRole.summary}</p>
          <ul className="journey__highlights">
            {currentRole.highlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
          <p className="journey__stack">
            {currentRole.stack.map((t) => (
              <em key={t}>{t}</em>
            ))}
          </p>
        </aside>

        <p className="journey__hint mono-label">Scroll to walk it</p>
      </div>
    </section>
  );
}
