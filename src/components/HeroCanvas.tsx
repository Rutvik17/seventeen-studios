'use client';

/**
 * Thin client-only wrapper around the Three.js particle scene.
 * Imported via `dynamic(..., { ssr: false })` so Three.js never runs on
 * the server — see Hero.tsx for the dynamic import.
 */

import { useEffect, useRef } from 'react';
import { initHeroScene } from '@/lib/three-scene';

export default function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dispose = initHeroScene(canvas);
    return dispose;
  }, []);

  return <canvas ref={canvasRef} id="hero-canvas" className="hero-canvas" />;
}
