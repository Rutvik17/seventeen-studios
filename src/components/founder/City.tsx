'use client';

/**
 * THE DRIVE — the founder page, entire.
 *
 * ==================================================================
 * SCROLL IS DISTANCE
 * ==================================================================
 *
 * One full-screen canvas, pinned. Scrolling moves the camera *along a road*
 * through a three-dimensional New York — from Bowling Green up Wall Street, out
 * over the Brooklyn Bridge, back across the Manhattan Bridge, up through the
 * Bowery to Times Square and on past Central Park to Harlem.
 *
 * There are no cards and no callout lines. Everything the page has to say is on
 * the overhead gantry signs, which is a better place for it: a sign is in the
 * city rather than over it, lit by the same clock, hazed by the same air, and
 * it arrives the way road signs arrive.
 *
 * ==================================================================
 * THE CAMERA NEVER LEAVES THE ROAD
 * ==================================================================
 *
 * Position comes from the route; **heading is derived from it**, never
 * authored. The view looks along the road because the camera is on the road, so
 * it cannot disagree with the direction of travel — which is the thing that
 * makes scripted camera paths feel like a ride rather than a drive.
 *
 * ==================================================================
 * TWO CLOCKS
 * ==================================================================
 *
 *   scroll  →  where you are on the road
 *   time    →  what moves on its own: traffic, signals, clouds, rain
 *
 * Keeping them separate is what stops the scene feeling either dead or
 * seasick. The traffic keeps flowing while you sit and read a sign, and it does
 * not lurch when you scroll.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { gsap, ScrollTrigger, prefersReducedMotion } from '@/lib/gsap';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { makeCamera, type Camera } from '@/lib/city/camera';
import { renderCity } from '@/lib/city/render';
import { paletteForHour, type Palette } from '@/lib/city/sketch';
import { at, buildCorridor, buildRoute, offsetFrom } from '@/lib/city/route';
import { LANE, makeTraffic, stepTraffic } from '@/lib/city/street';
import type { Sign } from '@/lib/city/signs';
import { DRIVE, MESSAGES } from '@/content/city-drive';
import { founder } from '@/content/founder';

/** The road, built once. It is a pure function of the waypoints. */
const ROUTE = buildRoute(DRIVE);

/**
 * The ground the road takes. Nothing is built on it.
 *
 * Half the roadway plus both pavements plus a metre of slack, so the facades
 * line the street rather than standing in it.
 */
const CORRIDOR = buildCorridor(ROUTE, LANE * 2.35 + 4.2 + 1);

/**
 * The gantries, placed along whatever road there now is.
 *
 * Positions are fractions of the route rather than distances in metres, so
 * changing the drive redistributes the signs instead of stranding them.
 */
const SIGNS: Sign[] = MESSAGES.map((message) => {
  const point = at(ROUTE, message.at * ROUTE.length);
  return {
    ...message,
    x: point.x,
    z: point.z,
    heading: point.heading,
    halfWidth: LANE * 2.1,
  };
});

/**
 * How much scroll a kilometre of road costs.
 *
 * Tuned by what it feels like rather than by what it measures: too little and
 * the city rushes past unread, too much and the page becomes a chore before the
 * first bridge. Roughly six hundred metres to a screen of scroll is a brisk
 * drive with time to read a sign as it comes up.
 */
const METRES_PER_SCREEN = 620;

/** Where the camera sits: driver's eye height, in the right-hand lane. */
const EYE = 1.55;

export function City() {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  /* Per-frame state, deliberately outside React. Touching state here would
     re-render the tree sixty times a second for no benefit. */
  const distance = useRef(0);
  const traffic = useRef(makeTraffic());
  const frame = useRef(0);

  const [reduced, setReduced] = useState(false);
  const [palette, setPalette] = useState<Palette>(() => paletteForHour(12));
  const [place, setPlace] = useState('');

  /* The viewer's own clock, so the drawing agrees with the window beside it. */
  useEffect(() => {
    const now = new Date();
    setPalette(paletteForHour(now.getHours() + now.getMinutes() / 60));
  }, []);

  const cameraFor = useCallback((d: number, width: number, height: number): Camera => {
    const point = at(ROUTE, d);
    // In a lane, not on the centreline — you drive on the right.
    const lane = offsetFrom(point, LANE * 0.55);
    return makeCamera({
      width,
      height,
      x: lane.x,
      z: lane.z,
      y: point.y + EYE,
      yaw: point.heading,
      pitch: 0,
      /*
        A rising front rather than a tilt, so the towers stay plumb. A tenth of
        the frame puts the horizon at sixty per cent of the height: enough road
        to read as driving, enough sky for the buildings to go up into.
      */
      shiftY: height * 0.1,
      fov: (54 * Math.PI) / 180,
    });
  }, []);

  /* ---- scroll ---- */
  useIsomorphicLayoutEffect(() => {
    const el = root.current;
    const stageEl = stage.current;
    if (!el || !stageEl) return;

    const low = prefersReducedMotion();
    setReduced(low);
    if (low) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top top',
        end: 'bottom bottom',
        pin: stageEl,
        pinSpacing: false,
        scrub: 0.5,
        onUpdate: (self) => {
          distance.current = self.progress * ROUTE.length;
          // The nearest named place behind us, for the corner of the screen.
          let name = '';
          for (const mark of ROUTE.marks) {
            if (mark.d <= distance.current + 40) name = mark.name;
          }
          setPlace((prev) => (prev === name ? prev : name));
        },
      });
    }, el);

    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, []);

  /* ---- the frame loop ---- */
  useEffect(() => {
    if (reduced) return;
    const el = canvas.current;
    if (!el) return;
    const ctx2d = el.getContext('2d', { alpha: false });
    if (!ctx2d) return;

    let width = 0;
    let height = 0;
    const start = performance.now();
    let last = start;

    const resize = () => {
      const rect = el.getBoundingClientRect();
      // Capped at 2: a 4K display at devicePixelRatio 3 is 33 million pixels a
      // frame, and line work gains almost nothing past two.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.round(rect.width);
      height = Math.round(rect.height);
      el.width = Math.round(width * dpr);
      el.height = Math.round(height * dpr);
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);

    const tick = (now: number) => {
      const time = (now - start) / 1000;
      // Clamped, so a backgrounded tab does not resume by teleporting every car
      // three hundred metres down the road.
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const d = distance.current;
      const here = at(ROUTE, d);
      stepTraffic(traffic.current, ROUTE, d, dt, here.oneWay);

      renderCity(ctx2d, cameraFor(d, width, height), {
        palette,
        time,
        route: ROUTE,
        distance: d,
        corridor: CORRIDOR,
        traffic: traffic.current,
        signs: SIGNS,
        // Detail stays tight: at street level you can see three blocks, and
        // spending the budget past that buys nothing you can look at.
        radius: 900,
        massRadius: 22000,
      });

      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame.current);
      observer.disconnect();
    };
  }, [reduced, palette, cameraFor]);

  /* --------------------------------------------------------------- */

  if (reduced) {
    return (
      <div className="city city--static">
        <h1>{founder.name}</h1>
        <p className="city__standfirst">{founder.standfirst}</p>
        <ol className="city__list">
          {MESSAGES.map((message) => (
            <li key={message.id}>
              <h2>{message.lines.join(' · ')}</h2>
              {message.footer ? <p>{message.footer}</p> : null}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div
      className="city"
      ref={root}
      style={{ height: `${Math.round((ROUTE.length / METRES_PER_SCREEN) * 100)}vh` }}
    >
      <div className="city__stage" ref={stage}>
        <canvas
          className="city__canvas"
          ref={canvas}
          role="img"
          aria-label={`A hand-drawn New York, driven from Bowling Green to Harlem. ${founder.name}, ${founder.role}.`}
        />
        <p className="city__place" aria-live="polite">
          {place}
        </p>
      </div>
    </div>
  );
}
