'use client';

/**
 * The 17, filling with water.
 *
 * The surface is solved by `lib/loader/water.ts` — the wave equation, disturbed
 * by the stream pouring into it — and drawn here by a fragment shader. The glyph
 * is a CSS mask over the canvas, so what you see is a tank of water with a
 * numeral-shaped window onto it.
 *
 * Falling drops and their splashes were built and then cut: at the size the mark
 * is drawn they read as specks rather than as water, and they distracted from
 * the surface, which is the part that reads.
 *
 * ---
 *
 * WHY THIS IS RAW WEBGL AND NOT THREE.JS
 *
 * three.js is already a dependency, and this is the one place on the site where
 * reaching for it would be the wrong call. Next code-splits by route, so three
 * currently lives in the founder chunk and nowhere else. Importing it here would
 * pull a 3D engine into the SHARED bundle — the loader is in the root layout, so
 * it is on the critical path of every first paint on every route.
 *
 * That is a real cost for no benefit: this draws one quad with one fragment
 * shader and never touches a scene graph, a camera, a material system or a
 * matrix. Raw WebGL2 is about sixty lines of setup and adds nothing to the
 * bundle. Making the loader the heaviest thing on the site would be a strange
 * way to make it feel fast.
 *
 * ---
 *
 * IT DEGRADES
 *
 * No WebGL2, or reduced motion, and the numeral fills with a flat gradient
 * instead — no canvas, no loop, no simulation. Rule 4: nothing a visitor needs
 * to see sits behind a script that might not run.
 */

import { useEffect, useRef, useState } from 'react';
import { LOGO_ONE, LOGO_SEVEN, LOGO_VIEWBOX } from '@/components/Logo';
import { Water } from '@/lib/loader/water';
import { prefersReducedMotion } from '@/lib/gsap';

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

/*
  The water, shaded.

  A pixel is under the water when it is below the surface at its own x, and the
  surface comes from the solver. Everything else is depth: the body darkens with
  how far below the surface a pixel is, and a thin bright band tracks the surface
  itself — the light that collects along the meniscus of any real body of water,
  and the thing that most makes a flat fill read as a liquid.

  There were two more loops here, blending falling drops and splash droplets into
  the body with a smooth maximum. They are gone: at the size this mark is drawn
  they read as specks rather than as water. The surface is what carries it.
*/
const FRAG = `#version 300 es
precision highp float;

uniform float uH[128];
uniform vec2 uSize;
uniform vec3 uShallow;
uniform vec3 uDeep;
uniform vec3 uFoam;

in vec2 vUv;
out vec4 fragColor;

float surfaceAt(float x) {
  float t = clamp(x, 0.0, 1.0) * 127.0;
  int i = int(floor(t));
  int j = min(i + 1, 127);
  return mix(uH[i], uH[j], t - float(i));
}

void main() {
  // Positive below the surface, negative above it.
  float w = surfaceAt(vUv.x) - vUv.y;

  // One pixel of coverage, in the same units as w.
  float edge = 1.2 / uSize.y;
  float inside = smoothstep(-edge, edge, w);
  if (inside <= 0.002) discard;

  float depth = clamp(w * 2.4, 0.0, 1.0);
  vec3 col = mix(uShallow, uDeep, depth);

  // The bright line along the surface.
  float band = 1.0 - smoothstep(0.0, 0.014, abs(w));
  col = mix(col, uFoam, band * 0.8);

  fragColor = vec4(col, inside);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

const hex = (value: string): [number, number, number] => {
  const n = parseInt(value.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

/** The glyph, as a mask. Two paths, filled — the shape of the window. */
const MASK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='${LOGO_VIEWBOX}'>` +
    `<path d='${LOGO_ONE}' fill='#fff'/><path d='${LOGO_SEVEN}' fill='#fff'/></svg>`,
)}")`;

export function LiquidMark({ progress }: { progress: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const target = useRef(0);
  const [fallback, setFallback] = useState(false);

  target.current = Math.max(0, Math.min(1, progress / 100));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (prefersReducedMotion()) {
      setFallback(true);
      return;
    }

    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
    });
    if (!gl) {
      setFallback(true);
      return;
    }

    const vert = compile(gl, gl.VERTEX_SHADER, VERT);
    const frag = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const program = vert && frag ? gl.createProgram() : null;
    if (!vert || !frag || !program) {
      setFallback(true);
      return;
    }
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      setFallback(true);
      return;
    }
    gl.useProgram(program);

    // One triangle covering the viewport — cheaper than two, and no seam.
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = {
      h: gl.getUniformLocation(program, 'uH'),
      size: gl.getUniformLocation(program, 'uSize'),
      shallow: gl.getUniformLocation(program, 'uShallow'),
      deep: gl.getUniformLocation(program, 'uDeep'),
      foam: gl.getUniformLocation(program, 'uFoam'),
    };

    const style = getComputedStyle(document.documentElement);
    const pick = (name: string, or: string) =>
      hex((style.getPropertyValue(name).trim() || or).slice(0, 7));
    gl.uniform3fv(u.shallow, pick('--accent', '#1b4fe0'));
    gl.uniform3fv(u.deep, pick('--accent-deep', '#12379c'));
    gl.uniform3fv(u.foam, [0.78, 0.86, 1.0]);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const water = new Water();
    const surface = new Float32Array(128);

    let raf = 0;
    let last = performance.now();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(u.size, w, h);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.25);
      last = now;

      /*
        The level chases the counter rather than snapping to it.

        Progress arrives in jumps — a font resolving, a chunk landing — and a
        surface that teleports is not a surface. Easing toward the target makes
        the RATE meaningful, and the rate is what `pour` needs: how fast the
        level is climbing is how hard the incoming stream presses on the water.
      */
      const before = water.level;
      water.level += (target.current - water.level) * Math.min(1, dt * 3.2);
      const rate = (water.level - before) / Math.max(dt, 1e-4);

      /*
        The stream lands just left of centre and digs a hollow where it hits.
        This is the only thing that disturbs the surface — the wave you see is
        that hollow propagating out, reflecting off both walls and crossing back
        over itself.
      */
      water.pour(0.42, rate, dt);

      water.step(dt);

      for (let i = 0; i < 128; i++) surface[i] = water.level + water.height[i];
      gl.uniform1fv(u.h, surface);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
    };
  }, []);

  return (
    <div className="liquid" aria-hidden="true">
      {/* The empty glyph, under everything. */}
      <svg className="liquid__base" viewBox={LOGO_VIEWBOX}>
        <path d={LOGO_ONE} />
        <path d={LOGO_SEVEN} />
      </svg>

      {fallback ? (
        /*
          No WebGL2, or reduced motion. A flat fill to the same level, with the
          same hard edge — the numeral still reports progress, it just does not
          slosh.
        */
        <div
          className="liquid__flat"
          style={{ '--fill': `${Math.round(progress)}%`, maskImage: MASK, WebkitMaskImage: MASK } as React.CSSProperties}
        />
      ) : (
        <canvas
          ref={canvasRef}
          className="liquid__water"
          style={{ maskImage: MASK, WebkitMaskImage: MASK } as React.CSSProperties}
        />
      )}
    </div>
  );
}
