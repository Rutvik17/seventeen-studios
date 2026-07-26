/**
 * Hero WebGL field.
 *
 * A single THREE.Points system of a few thousand vertices arranged on a
 * jittered grid and displaced every frame by 3D simplex noise in the vertex
 * shader. The GPU does all the movement — no per-frame buffer uploads, one
 * draw call — which is what lets it hold frame budget on a mid-tier laptop
 * while covering the whole viewport.
 *
 * Interaction:
 *   - the pointer pushes points away and heats them toward the accent colour
 *   - scroll progress drifts the field and fades it out under the content
 *   - `reveal` is driven by the preloader hand-off so the field builds in
 *
 * The caller owns the canvas; `dispose()` releases every GPU resource.
 */

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from 'three';
import { ACCENT_HEX } from '../tokens';

/** Ashima Arts' simplex noise (MIT) — trimmed to the 3D case we use. */
const SIMPLEX = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(
      i.z+vec4(0.0,i1.z,i2.z,1.0))
    + i.y+vec4(0.0,i1.y,i2.y,1.0))
    + i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const VERTEX = /* glsl */ `
uniform float uTime;
uniform float uScroll;
uniform float uReveal;
uniform vec2  uPointer;
uniform float uPointerStrength;
uniform float uSize;

attribute float aScale;
attribute float aSeed;

varying float vHeat;
varying float vAlpha;

${SIMPLEX}

void main() {
  vec3 pos = position;

  // Two octaves of drifting noise: a slow structural swell plus a faster
  // ripple, so the field reads as a system rather than static grain.
  float t = uTime * 0.06;
  float swell = snoise(vec3(pos.xy * 0.055, t));
  float ripple = snoise(vec3(pos.xy * 0.17 + 40.0, t * 2.1));

  pos.z += swell * 6.0 + ripple * 1.6;
  pos.x += swell * 1.4;
  pos.y += ripple * 0.9;

  // Build-in: points rise into place from below on reveal.
  pos.y -= (1.0 - uReveal) * (6.0 + aSeed * 14.0);

  // Scroll drift — the field sinks and slides as the page moves on.
  pos.y += uScroll * 9.0;
  pos.z -= uScroll * 5.0;

  // Pointer repulsion in the plane, falling off smoothly.
  vec2 toPointer = pos.xy - uPointer;
  float dist = length(toPointer);
  float influence = smoothstep(11.0, 0.0, dist) * uPointerStrength;
  pos.xy += normalize(toPointer + 0.0001) * influence * 3.4;
  pos.z += influence * 3.0;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;

  // Perspective-correct sizing, with a floor so distant points stay legible.
  gl_PointSize = uSize * aScale * (30.0 / -mv.z);

  vHeat = clamp(influence * 1.5 + swell * 0.28 + 0.16, 0.0, 1.0);
  vAlpha =
    uReveal *
    (0.22 + aSeed * 0.62) *
    smoothstep(1.0, 0.25, uScroll) *
    smoothstep(0.0, 0.35, uReveal);
}`;

const FRAGMENT = /* glsl */ `
precision mediump float;

uniform vec3 uAccent;
uniform vec3 uBase;

varying float vHeat;
varying float vAlpha;

void main() {
  // Soft round sprite — cheaper and crisper than a texture lookup.
  vec2 uv = gl_PointCoord - 0.5;
  float d = dot(uv, uv);
  if (d > 0.25) discard;
  float mask = smoothstep(0.25, 0.02, d);

  vec3 color = mix(uBase, uAccent, vHeat);
  gl_FragColor = vec4(color, mask * vAlpha);
}`;

export interface FieldHandle {
  setPointer(x: number, y: number): void;
  setScroll(progress: number): void;
  setReveal(value: number): void;
  resize(): void;
  dispose(): void;
}

export interface FieldOptions {
  /** Skip animation entirely and render one still frame. */
  reducedMotion?: boolean;
}

export function createField(
  canvas: HTMLCanvasElement,
  options: FieldOptions = {},
): FieldHandle {
  const { reducedMotion = false } = options;

  const renderer = new WebGLRenderer({
    canvas,
    antialias: false,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(58, 1, 0.1, 200);
  camera.position.set(0, 0, 34);

  // Density scales with viewport area, capped at both ends: enough points to
  // read as a field on a large display, few enough to stay cheap on a phone.
  const area = window.innerWidth * window.innerHeight;
  const count = Math.round(
    Math.min(5200, Math.max(1400, area / (window.innerWidth < 768 ? 340 : 300))),
  );

  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const seeds = new Float32Array(count);

  // Jittered grid: even coverage without the clumping of pure random.
  const cols = Math.ceil(Math.sqrt(count * 1.7));
  const rows = Math.ceil(count / cols);
  const spanX = 78;
  const spanY = 46;

  for (let i = 0; i < count; i += 1) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const jx = Math.random() - 0.5;
    const jy = Math.random() - 0.5;

    positions[i * 3] = (col / (cols - 1) - 0.5) * spanX + jx * (spanX / cols) * 1.8;
    positions[i * 3 + 1] = (row / (rows - 1) - 0.5) * spanY + jy * (spanY / rows) * 1.8;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10;

    scales[i] = 0.4 + Math.random() * 1.5;
    seeds[i] = Math.random();
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aScale', new BufferAttribute(scales, 1));
  geometry.setAttribute('aSeed', new BufferAttribute(seeds, 1));

  const material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uReveal: { value: reducedMotion ? 1 : 0 },
      uPointer: { value: [0, 0] },
      uPointerStrength: { value: reducedMotion ? 0 : 1 },
      uSize: { value: 4.2 },
      uAccent: { value: new Color(ACCENT_HEX) },
      uBase: { value: new Color(0x7f8b9c) },
    },
  });

  const points = new Points(geometry, material);
  scene.add(points);

  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let scroll = 0;
  let scrollTarget = 0;
  let reveal = reducedMotion ? 1 : 0;
  let revealTarget = reducedMotion ? 1 : 0;
  let raf = 0;
  let running = true;

  function resize() {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Pull the camera back on narrow viewports so the field still fills it.
    camera.position.z = 34 * Math.max(1, 1.55 / camera.aspect);
    camera.updateProjectionMatrix();
  }

  let last = performance.now();
  let elapsed = 0;

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const delta = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!running) return;

    elapsed += delta;

    // Everything eases toward its target so input never snaps.
    pointer.x += (pointer.targetX - pointer.x) * 0.06;
    pointer.y += (pointer.targetY - pointer.y) * 0.06;
    scroll += (scrollTarget - scroll) * 0.08;
    reveal += (revealTarget - reveal) * 0.035;

    material.uniforms.uTime.value = elapsed;
    material.uniforms.uPointer.value = [pointer.x * 34, pointer.y * 20];
    material.uniforms.uScroll.value = scroll;
    material.uniforms.uReveal.value = reveal;

    // Counter-parallax on the camera doubles the sense of depth for free.
    camera.position.x += (pointer.x * -2.4 - camera.position.x) * 0.04;
    camera.position.y += (pointer.y * -1.6 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }

  resize();

  if (reducedMotion) {
    // One still frame: the composition, none of the movement.
    material.uniforms.uTime.value = 12;
    renderer.render(scene, camera);
  } else {
    raf = requestAnimationFrame(frame);
  }

  const onVisibility = () => {
    running = !document.hidden;
    last = performance.now();
  };
  document.addEventListener('visibilitychange', onVisibility);

  return {
    setPointer(x, y) {
      if (reducedMotion) return;
      pointer.targetX = x;
      pointer.targetY = y;
    },
    setScroll(progress) {
      scrollTarget = progress;
      if (reducedMotion) {
        material.uniforms.uScroll.value = progress;
        renderer.render(scene, camera);
      }
    },
    setReveal(value) {
      revealTarget = value;
    },
    resize,
    dispose() {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}
