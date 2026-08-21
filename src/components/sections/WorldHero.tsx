'use client';

/**
 * The world you arrive in.
 *
 * A valley at dusk: four ridgelines, a gate, floating lanterns, and six wind
 * chimes on a beam across the top. The ridges parallax as you scroll and drift
 * with the pointer; the chimes are pendulums driven by the page's own scroll
 * acceleration, so they swing when you move and go on ringing after you stop.
 *
 * ---
 *
 * WHY THE CHIMES ARE NOT MAPPED TO SCROLL POSITION
 *
 * The easy version is `rotation = scrollY * k`, and it is dead on arrival:
 * scrolling back up unwinds it exactly, so the chimes behave like a dial rather
 * than like objects. Feeding scroll ACCELERATION into a pendulum's pivot term
 * instead gives them momentum — they lag the start of a scroll, overshoot when
 * it stops, and keep swinging at their own natural period afterwards. Six
 * unequal lengths then drift permanently in and out of phase.
 *
 * That is one term in `lib/physics.ts` and it is the whole difference between
 * decoration and a world that appears to have air in it.
 *
 * ---
 *
 * WHY SVG
 *
 * A silhouette scene is a few dozen filled paths. WebGL would mean a context,
 * a shader compile and a second copy of the palette for the sake of geometry a
 * browser rasterises for free — and it would fall over entirely on a machine
 * with no GPU. The site already carries one WebGL field; this does not need to
 * be the second.
 *
 * ---
 *
 * REDUCED MOTION
 *
 * The scene renders in full, statically. Nothing parallaxes, nothing swings,
 * no frame loop is started — the chimes simply hang at their resting phase.
 * The world is still a world; it is just not windy.
 */

import { useRef } from 'react';
import { gsap, ScrollTrigger, prefersReducedMotion } from '@/lib/gsap';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { Pendulum, clamp } from '@/lib/physics';
import {
  CHIMES,
  CHIME_BAND_H,
  LANTERNS,
  RIDGES,
  SCENE_H,
  SCENE_W,
  ridgePath,
  torii,
} from '@/lib/scenery';
import { SplitText } from '@/components/motion/SplitText';
import { Reveal } from '@/components/motion/Reveal';
import { TransitionLink } from '@/components/Transition';
import { hero } from '@/content/studio';

const GATE = torii(SCENE_W * 0.5, SCENE_H * 0.93, SCENE_H * 0.62);

export function WorldHero() {
  const root = useRef<HTMLElement>(null);
  const sceneRef = useRef<SVGSVGElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = root.current;
    const svg = sceneRef.current;
    if (!el || !svg) return;
    if (prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      /* ---- ridge parallax on scroll ---------------------------------- */
      const layers = gsap.utils.toArray<SVGGElement>('[data-ridge]');
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.5,
        },
      });
      layers.forEach((layer, i) => {
        // Nearer layers travel further. That ratio IS the depth cue — get it
        // backwards and the mountains appear to be in front of the gate.
        const depth = (i + 1) / layers.length;
        tl.to(layer, { yPercent: depth * 14, ease: 'none' }, 0);
      });
      tl.to('[data-sky-body]', { yPercent: 6, ease: 'none' }, 0);
      tl.to('[data-gate]', { yPercent: 9, ease: 'none' }, 0);

      /* ---- pointer drift --------------------------------------------- */
      // Fine pointers only. On a touch screen there is no hover, and a drift
      // driven by taps reads as the page glitching.
      const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      let onMove: ((e: PointerEvent) => void) | null = null;
      if (fine) {
        const movers = layers.map((layer, i) =>
          gsap.quickTo(layer, 'x', { duration: 1.1, ease: 'power3.out' }),
        );
        onMove = (e: PointerEvent) => {
          const nx = e.clientX / window.innerWidth - 0.5;
          movers.forEach((move, i) => move(nx * (i + 1) * -9));
        };
        window.addEventListener('pointermove', onMove, { passive: true });
      }

      /* ---- chimes ----------------------------------------------------- */
      const bells = CHIMES.map((spec) => ({
        spec,
        node: el.querySelector<SVGGElement>(`[data-chime="${spec.id}"]`),
        pendulum: new Pendulum(spec.phase, {
          length: spec.length,
          gravity: 9.81,
          // Low damping: a real furin rings for a long time. High damping is
          // the usual mistake and it makes them look like they are in syrup.
          damping: 0.42,
        }),
      }));

      const lanterns = LANTERNS.map((spec) => ({
        spec,
        node: svg.querySelector<SVGGElement>(`[data-lantern="${spec.id}"]`),
      }));

      let lastY = window.scrollY;
      let lastVel = 0;
      let lastT = performance.now();
      let clock = 0;

      const frame = () => {
        const now = performance.now();
        const dt = Math.min((now - lastT) / 1000, 0.05);
        lastT = now;
        clock += dt;

        const y = window.scrollY;
        const vel = (y - lastY) / Math.max(dt, 1e-5);
        lastY = y;
        const accel = clamp((vel - lastVel) * 0.0016, -60, 60);
        lastVel = vel;

        for (const bell of bells) {
          bell.pendulum.step(dt, accel);
          if (!bell.node) continue;
          const deg = (bell.pendulum.angle * 180) / Math.PI;
          bell.node.setAttribute(
            'transform',
            `rotate(${deg.toFixed(2)} ${bell.spec.x} ${bell.spec.y})`,
          );
        }

        for (const lantern of lanterns) {
          if (!lantern.node) continue;
          const { period, phase, scale } = lantern.spec;
          const t = (clock / period) * Math.PI * 2 + phase;
          // A lantern on a thermal: a slow figure-of-eight, which is two sines
          // at a 2:1 ratio. One sine alone reads as a metronome.
          const dx = Math.sin(t) * 13 * scale;
          const dy = Math.sin(t * 2) * 8 * scale;
          lantern.node.setAttribute(
            'transform',
            `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`,
          );
        }
      };

      gsap.ticker.add(frame);
      ScrollTrigger.refresh();

      return () => {
        gsap.ticker.remove(frame);
        if (onMove) window.removeEventListener('pointermove', onMove);
      };
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section className="world" id="top" ref={root}>
      <svg
        className="world__scene"
        ref={sceneRef}
        viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="w-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--sky-top)" />
            <stop offset="46%" stopColor="var(--sky-mid)" />
            <stop offset="78%" stopColor="var(--sky-low)" />
            <stop offset="100%" stopColor="var(--sky-horizon)" />
          </linearGradient>
          <radialGradient id="w-sun" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--sky-horizon)" stopOpacity="0.95" />
            <stop offset="60%" stopColor="var(--lantern)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--lantern)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="w-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--lantern)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--lantern)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g data-sky-body>
          <rect x="0" y="0" width={SCENE_W} height={SCENE_H} fill="url(#w-sky)" />
          <circle cx={SCENE_W * 0.5} cy={SCENE_H * 0.66} r={210} fill="url(#w-sun)" />
          <circle
            cx={SCENE_W * 0.5}
            cy={SCENE_H * 0.66}
            r={58}
            fill="var(--sky-horizon)"
            opacity="0.9"
          />
        </g>

        {RIDGES.map((spec, i) => (
          <g data-ridge key={spec.seed}>
            <path d={ridgePath(spec)} fill={`var(--ridge-${i + 1})`} />
          </g>
        ))}

        {/*
          The gate sits between the third and fourth ridge, so the nearest
          ridge crosses in front of its feet. That single overlap is what puts
          it IN the valley rather than on top of a picture of one.
        */}
        <g data-gate opacity="0.96">
          <path d={GATE.pillarLeft} fill="var(--accent-deep)" />
          <path d={GATE.pillarRight} fill="var(--accent-deep)" />
          <path d={GATE.nuki} fill="var(--accent)" />
          <path d={GATE.kasagi} fill="var(--accent)" />
        </g>
        <g data-ridge>
          <path d={ridgePath(RIDGES[RIDGES.length - 1])} fill="var(--ridge-4)" />
        </g>

        {LANTERNS.map((spec) => (
          <g data-lantern={spec.id} key={spec.id}>
            <g transform={`translate(${spec.x} ${spec.y}) scale(${spec.scale})`}>
              <circle cx="0" cy="0" r="54" fill="url(#w-glow)" />
              <path
                d="M -15 -20 Q -21 0 -15 20 L 15 20 Q 21 0 15 -20 Z"
                fill="var(--lantern)"
                opacity="0.94"
              />
              <rect x="-17" y="-24" width="34" height="5" rx="2" fill="var(--accent-deep)" />
              <rect x="-17" y="19" width="34" height="5" rx="2" fill="var(--accent-deep)" />
            </g>
          </g>
        ))}

      </svg>

      {/*
        The chimes are a SEPARATE svg pinned to the top edge.

        In the scene above they would be clipped away entirely: an `<svg>` clips
        to its viewBox, and the scene is drawn with `slice`, so on any viewport
        wider than 16:9 the top band is cropped as well. `xMidYMin` anchors this
        strip to the top of what the visitor can actually see, whatever the
        scene behind it is doing.
      */}
      <svg
        className="world__chimes"
        viewBox={`0 0 ${SCENE_W} ${CHIME_BAND_H}`}
        preserveAspectRatio="xMidYMin slice"
        aria-hidden="true"
      >
        <rect x="0" y="0" width={SCENE_W} height="16" fill="var(--ridge-4)" />
        {CHIMES.map((spec) => (
          <g data-chime={spec.id} key={spec.id}>
            <line
              x1={spec.x}
              y1={spec.y}
              x2={spec.x}
              y2={spec.y + spec.cord}
              stroke="var(--ridge-3)"
              strokeWidth="2"
            />
            <path
              d={`M ${spec.x - spec.r} ${spec.y + spec.cord}
                  a ${spec.r} ${spec.r} 0 0 1 ${spec.r * 2} 0
                  l 0 ${spec.r * 0.5}
                  a ${spec.r} ${spec.r * 0.4} 0 0 1 ${-spec.r * 2} 0 Z`}
              fill="var(--accent-2)"
            />
            {/* The paper tanzaku under the bell. */}
            <rect
              x={spec.x - spec.r * 0.32}
              y={spec.y + spec.cord + spec.r * 0.8}
              width={spec.r * 0.64}
              height={spec.r * 2.1}
              rx="2"
              fill="var(--bg-raise)"
              opacity="0.86"
            />
          </g>
        ))}
      </svg>

      <div className="world__content">
        <Reveal className="world__eyebrow">
          <span className="mono-label">{hero.eyebrow}</span>
        </Reveal>
        <SplitText as="h1" className="world__title" stagger={0.045} depth>
          {hero.title}
        </SplitText>
        <Reveal className="world__lead" delay={0.1}>
          <p>{hero.lead}</p>
        </Reveal>
        <Reveal className="world__actions" delay={0.18}>
          <TransitionLink href="/start/" className="button button--solid" data-cursor="Begin">
            {hero.primaryAction} <i aria-hidden="true">→</i>
          </TransitionLink>
          <TransitionLink href="/products/grasp/" className="link-arrow" data-cursor="Open">
            {hero.secondaryAction} <i aria-hidden="true">→</i>
          </TransitionLink>
        </Reveal>
      </div>

      <div className="world__scrim" aria-hidden="true" />
    </section>
  );
}
