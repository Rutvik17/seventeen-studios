/**
 * Hero WebGL particle system.
 *
 * Mirrors the reference implementation from `design-reference/three-scene.js`
 * but typed and exposed as an `initHeroScene()` factory returning a disposer.
 *
 * Usage from a component:
 *   useEffect(() => {
 *     const dispose = initHeroScene(canvasEl);
 *     return dispose;
 *   }, []);
 */

import * as THREE from 'three';
import { ACCENT_HEX_NUMERIC } from './tokens';

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

export function initHeroScene(canvas: HTMLCanvasElement): () => void {
  const W = () => canvas.clientWidth || window.innerWidth;
  const H = () => canvas.clientHeight || window.innerHeight;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(60, W() / H(), 0.1, 1000);
  camera.position.z = 22;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W(), H(), false);
  renderer.setClearColor(0x000000, 0);

  // Reduce particle count on small screens.
  const isMobile = window.innerWidth < 768;
  const N = isMobile ? 80 : 160;
  const DIST_THRESHOLD = 5.5;

  const particles: Particle[] = [];
  for (let i = 0; i < N; i++) {
    particles.push({
      x: (Math.random() - 0.5) * 32,
      y: (Math.random() - 0.5) * 20,
      z: (Math.random() - 0.5) * 10,
      vx: (Math.random() - 0.5) * 0.012,
      vy: (Math.random() - 0.5) * 0.008,
      vz: (Math.random() - 0.5) * 0.004,
    });
  }

  // --- Points ---
  const dotGeo = new THREE.BufferGeometry();
  const dotPositions = new Float32Array(N * 3);
  dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPositions, 3));

  const dotMat = new THREE.PointsMaterial({
    color: ACCENT_HEX_NUMERIC,
    size: 0.12,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
  });
  const dots = new THREE.Points(dotGeo, dotMat);
  scene.add(dots);

  // --- Connection lines (pre-allocated buffer, dynamic draw range) ---
  const maxSegments = N * N;
  const lineBuf = new Float32Array(maxSegments * 6);
  const lineGeo = new THREE.BufferGeometry();
  const linePosAttr = new THREE.BufferAttribute(lineBuf, 3);
  linePosAttr.setUsage(THREE.DynamicDrawUsage);
  lineGeo.setAttribute('position', linePosAttr);

  const lineMat = new THREE.LineBasicMaterial({
    color: ACCENT_HEX_NUMERIC,
    transparent: true,
    opacity: 0.12,
  });
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  scene.add(lines);

  // --- Mouse parallax ---
  let mouseX = 0;
  let mouseY = 0;
  let targetMX = 0;
  let targetMY = 0;
  const onMouseMove = (e: MouseEvent) => {
    targetMX = (e.clientX / window.innerWidth - 0.5) * 2;
    targetMY = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  window.addEventListener('mousemove', onMouseMove);

  // --- Resize ---
  const onResize = () => {
    camera.aspect = W() / H();
    camera.updateProjectionMatrix();
    renderer.setSize(W(), H(), false);
  };
  window.addEventListener('resize', onResize);

  // --- Animate ---
  let rafId = 0;
  let running = true;

  const animate = () => {
    if (!running) return;
    rafId = requestAnimationFrame(animate);

    mouseX += (targetMX - mouseX) * 0.04;
    mouseY += (targetMY - mouseY) * 0.04;

    camera.position.x += (mouseX * 2 - camera.position.x) * 0.04;
    camera.position.y += (-mouseY * 1 - camera.position.y) * 0.04;

    // Update particles
    for (let i = 0; i < N; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;

      if (Math.abs(p.x) > 17) p.vx *= -1;
      if (Math.abs(p.y) > 11) p.vy *= -1;
      if (Math.abs(p.z) > 6) p.vz *= -1;

      dotPositions[i * 3] = p.x;
      dotPositions[i * 3 + 1] = p.y;
      dotPositions[i * 3 + 2] = p.z;
    }
    dotGeo.attributes.position.needsUpdate = true;

    // Update connection lines
    let lc = 0;
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const a = particles[i];
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < DIST_THRESHOLD * DIST_THRESHOLD) {
          const o = lc * 6;
          lineBuf[o] = a.x;
          lineBuf[o + 1] = a.y;
          lineBuf[o + 2] = a.z;
          lineBuf[o + 3] = b.x;
          lineBuf[o + 4] = b.y;
          lineBuf[o + 5] = b.z;
          lc++;
        }
      }
    }
    lineGeo.setDrawRange(0, lc * 2);
    lineGeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  };

  animate();

  // Disposer
  return () => {
    running = false;
    cancelAnimationFrame(rafId);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('resize', onResize);

    dotGeo.dispose();
    dotMat.dispose();
    lineGeo.dispose();
    lineMat.dispose();
    renderer.dispose();

    scene.remove(dots);
    scene.remove(lines);
  };
}
