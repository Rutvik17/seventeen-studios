/**
 * Hero WebGL scene.
 *
 * Three layers, one draw pass each, composited through a post chain:
 *
 *   1. Core      — a 48-subdivision icosahedron displaced in the vertex shader
 *                  by two octaves of simplex noise, shaded with a fresnel rim
 *                  and contour banding rather than lights. It breathes, and it
 *                  spikes on scroll velocity.
 *   2. Scaffold  — a low-poly wireframe shell counter-rotating around the core,
 *                  additively blended: the "engineering drawing" over the form.
 *   3. Field     — a spherical shell of points drifting on curl-ish noise, with
 *                  pointer repulsion, giving the core somewhere to sit.
 *
 * Post-processing: selective bloom on the accent rim, then a final pass doing
 * velocity-driven chromatic aberration, vignette and grain. The aberration is
 * the piece that makes fast scrolling feel physical — it is driven by real
 * scroll velocity, not by a timer.
 *
 * Everything is GPU-side: no per-frame buffer uploads, three draw calls, and a
 * quality tier chosen from the device at construction.
 */

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  IcosahedronGeometry,
  Mesh,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer,
  WireframeGeometry,
  LineSegments,
  LineBasicMaterial,
} from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { ACCENT_HEX, BG_HEX } from '../tokens';

/** Ashima Arts' simplex noise (MIT), 3D case only. */
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

/* ------------------------------------------------------------------ core */

const CORE_VERT = /* glsl */ `
uniform float uTime;
uniform float uDistort;
uniform float uSpike;
uniform float uReveal;
uniform vec2  uPointer;

varying vec3  vViewPos;
varying vec3  vLocal;
varying float vNoise;

${SIMPLEX}

void main() {
  vec3 dir = normalize(position);

  // Two octaves: a slow structural swell and a faster surface ripple.
  float swell  = snoise(dir * 1.35 + vec3(0.0, 0.0, uTime * 0.19));
  float ripple = snoise(position * 0.85 - vec3(uTime * 0.14));
  float amount = swell * 0.62 + ripple * 0.32;

  // The pointer pulls the surface toward it — the form notices the cursor.
  float pull = smoothstep(1.4, 0.0, distance(dir.xy, uPointer)) * 0.34;

  vec3 displaced = position + dir * (amount * (uDistort + uSpike) + pull);

  // Build-in: the form inflates from a sphere as the page hands over.
  displaced = mix(dir * 2.1, displaced, uReveal);

  vec4 mv = modelViewMatrix * vec4(displaced, 1.0);

  vNoise   = amount;
  vLocal   = displaced;
  vViewPos = mv.xyz;

  gl_Position = projectionMatrix * mv;
}`;

const CORE_FRAG = /* glsl */ `
precision highp float;

uniform vec3  uAccent;
uniform vec3  uDeep;
uniform vec3  uShadow;
uniform float uTime;
uniform float uReveal;
uniform float uRim;

varying vec3  vViewPos;
varying vec3  vLocal;
varying float vNoise;

void main() {
  // The vertex shader displaces the surface, which invalidates the supplied
  // normals — so derive the true geometric normal per fragment from the
  // screen-space derivatives of the view position. Without this the fresnel
  // term is meaningless and the whole object glows.
  vec3 normal = normalize(cross(dFdx(vViewPos), dFdy(vViewPos)));
  vec3 view = normalize(-vViewPos);

  float facing = clamp(dot(normal, view), 0.0, 1.0);
  float fresnel = pow(1.0 - facing, 3.0);

  // Body: near-black graphite with a cool cast in the creases.
  vec3 color = mix(uShadow, uDeep, clamp(vNoise * 0.5 + 0.5, 0.0, 1.0));

  // A single soft key light so the form has volume rather than flat fill.
  float key = pow(clamp(dot(normal, normalize(vec3(0.45, 0.75, 0.5))), 0.0, 1.0), 1.6);
  color += vec3(0.10, 0.12, 0.15) * key;

  // Accent lives only at the silhouette: a rim, not a fill.
  color = mix(color, uAccent, fresnel * 0.42 * uRim);
  color += uAccent * smoothstep(0.76, 1.0, fresnel) * 0.7 * uRim;

  // Contour banding — a topographic reading of the displacement.
  float bands = abs(fract(vLocal.y * 2.6 - uTime * 0.06) - 0.5);
  color += uAccent * smoothstep(0.045, 0.0, bands) * 0.1 * (1.0 - fresnel);

  gl_FragColor = vec4(color, uReveal);
}`;

/* ---------------------------------------------------------------- field */

const FIELD_VERT = /* glsl */ `
uniform float uTime;
uniform float uReveal;
uniform float uScroll;
uniform vec2  uPointer;
uniform float uSize;

attribute float aScale;
attribute float aSeed;

varying float vHeat;
varying float vAlpha;

${SIMPLEX}

void main() {
  vec3 pos = position;

  // Slow orbital drift plus noise turbulence: a shell in motion, not dust.
  float angle = uTime * (0.02 + aSeed * 0.03);
  float s = sin(angle);
  float c = cos(angle);
  pos.xz = mat2(c, -s, s, c) * pos.xz;

  float turbulence = snoise(pos * 0.16 + vec3(0.0, uTime * 0.05, 0.0));
  pos += normalize(pos) * turbulence * 1.4;

  vec2 toPointer = pos.xy - uPointer * 9.0;
  float influence = smoothstep(7.0, 0.0, length(toPointer));
  pos.xy += normalize(toPointer + 0.0001) * influence * 2.2;

  pos.y += uScroll * 6.0;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * aScale * (44.0 / -mv.z);

  vHeat = clamp(influence * 1.4 + aSeed * 0.3, 0.0, 1.0);
  vAlpha = uReveal * (0.12 + aSeed * 0.42) * smoothstep(1.25, 0.15, uScroll);
}`;

const FIELD_FRAG = /* glsl */ `
precision mediump float;

uniform vec3 uAccent;
uniform vec3 uBase;

varying float vHeat;
varying float vAlpha;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = dot(uv, uv);
  if (d > 0.25) discard;
  float mask = smoothstep(0.25, 0.01, d);
  gl_FragColor = vec4(mix(uBase, uAccent, vHeat), mask * vAlpha);
}`;

/* ----------------------------------------------------------- final pass */

const FINAL_SHADER = {
  uniforms: {
    tDiffuse: { value: null as unknown },
    uAberration: { value: 0 },
    uTime: { value: 0 },
    uVignette: { value: 0.85 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    precision highp float;

    uniform sampler2D tDiffuse;
    uniform float uAberration;
    uniform float uTime;
    uniform float uVignette;

    varying vec2 vUv;

    void main() {
      vec2 dir = vUv - 0.5;
      float dist = length(dir);

      // Radial chromatic aberration: nothing at the centre, strongest at the
      // edges, scaled by how fast the page is moving.
      float amount = uAberration * (0.18 + dist * 1.6);
      vec4 color;
      color.r = texture2D(tDiffuse, vUv - dir * amount).r;
      color.g = texture2D(tDiffuse, vUv).g;
      color.b = texture2D(tDiffuse, vUv + dir * amount).b;
      color.a = 1.0;

      color.rgb *= mix(1.0, smoothstep(1.0, 0.24, dist), uVignette);

      // Per-frame grain, so the WebGL layer matches the page's film overlay.
      float grain = fract(sin(dot(vUv + fract(uTime), vec2(12.9898, 78.233))) * 43758.5453);
      color.rgb += (grain - 0.5) * 0.028;

      gl_FragColor = color;
    }`,
};

/* ------------------------------------------------------------------ API */

export interface SceneHandle {
  setPointer(x: number, y: number): void;
  setScroll(progress: number): void;
  /** Normalised scroll velocity, roughly -1…1 at speed. */
  setVelocity(value: number): void;
  setReveal(value: number): void;
  resize(): void;
  dispose(): void;
}

export interface SceneOptions {
  reducedMotion?: boolean;
}

interface Tier {
  coreDetail: number;
  particles: number;
  bloom: boolean;
  maxDpr: number;
}

/** Pick a quality tier from the device before anything is allocated. */
function pickTier(): Tier {
  const width = window.innerWidth;
  const cores = navigator.hardwareConcurrency ?? 4;
  const coarse = window.matchMedia('(pointer: coarse)').matches;

  if (width < 768 || coarse || cores <= 4) {
    return { coreDetail: 16, particles: 1400, bloom: false, maxDpr: 1.5 };
  }
  if (width < 1400 || cores <= 8) {
    return { coreDetail: 32, particles: 2800, bloom: true, maxDpr: 1.6 };
  }
  return { coreDetail: 48, particles: 4200, bloom: true, maxDpr: 1.75 };
}

export function createScene(
  canvas: HTMLCanvasElement,
  options: SceneOptions = {},
): SceneHandle {
  const { reducedMotion = false } = options;
  const tier = pickTier();

  const renderer = new WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor(BG_HEX, 1);

  const scene = new Scene();
  const camera = new PerspectiveCamera(50, 1, 0.1, 120);
  camera.position.set(0, 0, 13);

  const accent = new Color(ACCENT_HEX);
  const world = new Group();
  scene.add(world);

  /* Core -------------------------------------------------------------- */

  const coreGeometry = new IcosahedronGeometry(2.35, tier.coreDetail);
  const coreMaterial = new ShaderMaterial({
    vertexShader: CORE_VERT,
    fragmentShader: CORE_FRAG,
    transparent: true,
    uniforms: {
      uTime: { value: 0 },
      uDistort: { value: 0.62 },
      uSpike: { value: 0 },
      uReveal: { value: reducedMotion ? 1 : 0 },
      uPointer: { value: new Vector2(0, 0) },
      uAccent: { value: accent },
      // Tiers without bloom lose the glow that sells the rim, so the shader
      // compensates directly.
      uRim: { value: tier.bloom ? 1 : 1.5 },
      uDeep: { value: new Color(0x141a22) },
      uShadow: { value: new Color(0x07070c) },
    },
  });
  const core = new Mesh(coreGeometry, coreMaterial);
  world.add(core);

  /* Scaffold ----------------------------------------------------------- */

  const scaffoldSource = new IcosahedronGeometry(3.15, 1);
  const scaffoldGeometry = new WireframeGeometry(scaffoldSource);
  const scaffoldMaterial = new LineBasicMaterial({
    color: accent,
    transparent: true,
    opacity: reducedMotion ? 0.16 : 0,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  const scaffold = new LineSegments(scaffoldGeometry, scaffoldMaterial);
  world.add(scaffold);

  /* Field -------------------------------------------------------------- */

  const count = tier.particles;
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const seeds = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    // Even distribution over a shell, biased outward so the core stays clear.
    const u = Math.random();
    const v = Math.random();
    const theta = u * Math.PI * 2;
    const phi = Math.acos(2 * v - 1);
    const radius = 5.4 + Math.pow(Math.random(), 0.6) * 9.5;

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.72;
    positions[i * 3 + 2] = radius * Math.cos(phi);

    scales[i] = 0.35 + Math.random() * 1.4;
    seeds[i] = Math.random();
  }

  const fieldGeometry = new BufferGeometry();
  fieldGeometry.setAttribute('position', new BufferAttribute(positions, 3));
  fieldGeometry.setAttribute('aScale', new BufferAttribute(scales, 1));
  fieldGeometry.setAttribute('aSeed', new BufferAttribute(seeds, 1));

  const fieldMaterial = new ShaderMaterial({
    vertexShader: FIELD_VERT,
    fragmentShader: FIELD_FRAG,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uReveal: { value: reducedMotion ? 1 : 0 },
      uScroll: { value: 0 },
      uPointer: { value: new Vector2(0, 0) },
      uSize: { value: 1.9 },
      uAccent: { value: accent },
      uBase: { value: new Color(0x8892a4) },
    },
  });
  const field = new Points(fieldGeometry, fieldMaterial);
  scene.add(field);

  /* Post chain ---------------------------------------------------------- */

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  let bloomPass: UnrealBloomPass | null = null;
  if (tier.bloom) {
    bloomPass = new UnrealBloomPass(new Vector2(1, 1), 0.42, 0.7, 0.82);
    composer.addPass(bloomPass);
  }

  const finalPass = new ShaderPass(FINAL_SHADER);
  finalPass.renderToScreen = true;
  composer.addPass(finalPass);

  /* Loop ---------------------------------------------------------------- */

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let scroll = 0;
  let scrollTarget = 0;
  let velocity = 0;
  let velocityTarget = 0;
  let reveal = reducedMotion ? 1 : 0;
  let revealTarget = reducedMotion ? 1 : 0;
  let elapsed = 0;
  let last = performance.now();
  let raf = 0;
  let running = true;

  function resize() {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio, tier.maxDpr);

    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    composer.setPixelRatio(dpr);
    composer.setSize(width, height);
    bloomPass?.setSize(width, height);

    camera.aspect = width / height;
    // Frame the object consistently regardless of viewport proportions. The
    // pull-back is clamped: an unclamped aspect correction pushes the form to
    // a speck on a tall phone screen.
    camera.position.z = 13 * Math.min(Math.max(1, 1.45 / camera.aspect), 1.32);
    camera.updateProjectionMatrix();
  }

  function render() {
    composer.render();
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const delta = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!running) return;
    elapsed += delta;

    // Everything eases toward its target, so no input ever snaps.
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;
    scroll += (scrollTarget - scroll) * 0.08;
    velocity += (velocityTarget - velocity) * 0.12;
    reveal += (revealTarget - reveal) * 0.04;

    const speed = Math.abs(velocity);

    coreMaterial.uniforms.uTime.value = elapsed;
    coreMaterial.uniforms.uReveal.value = reveal;
    coreMaterial.uniforms.uPointer.value.set(pointer.x * 1.6, pointer.y * 1.1);
    // Fast scrolling stretches the form; it settles the moment you stop.
    coreMaterial.uniforms.uSpike.value = speed * 0.55;
    coreMaterial.uniforms.uDistort.value = 0.62 + Math.sin(elapsed * 0.35) * 0.08;

    fieldMaterial.uniforms.uTime.value = elapsed;
    fieldMaterial.uniforms.uReveal.value = reveal;
    fieldMaterial.uniforms.uScroll.value = scroll;
    fieldMaterial.uniforms.uPointer.value.set(pointer.x, pointer.y);

    scaffoldMaterial.opacity = reveal * (0.14 + speed * 0.1);

    // Core and scaffold counter-rotate; the pointer adds a lean on top.
    core.rotation.y = elapsed * 0.11 + pointer.x * 0.35;
    core.rotation.x = Math.sin(elapsed * 0.16) * 0.14 - pointer.y * 0.28;
    scaffold.rotation.y = -elapsed * 0.07 - pointer.x * 0.2;
    scaffold.rotation.z = elapsed * 0.045;

    // Scroll pushes the whole assembly back and down, under the content.
    const sink = Math.min(scroll, 1.4);
    // On wide viewports the form sits in the empty right-hand column rather
    // than behind the wordmark; on narrow ones it centres.
    const wide = camera.aspect > 1.15;
    const offsetX = wide ? 3.1 : 0;
    world.position.x += (offsetX - world.position.x) * 0.08;
    // Portrait has no free column, so the form takes the empty band above the
    // headline instead of sitting behind it.
    world.position.y = (wide ? 1.1 : 3.6) - sink * 3.4;
    world.position.z = -sink * 6.0;
    world.scale.setScalar(1 - sink * 0.12);

    camera.position.x += (pointer.x * -1.5 - camera.position.x) * 0.04;
    camera.position.y += (pointer.y * -1.0 - camera.position.y) * 0.04;
    camera.lookAt(world.position.x * 0.35, world.position.y * 0.4, 0);

    finalPass.uniforms.uTime.value = elapsed;
    finalPass.uniforms.uAberration.value = Math.min(speed * 0.02, 0.02);

    if (bloomPass) bloomPass.strength = 0.34 + reveal * 0.14 + speed * 0.1;

    render();
  }

  resize();

  if (reducedMotion) {
    // One composed still frame: the object, none of the movement.
    coreMaterial.uniforms.uTime.value = 8;
    fieldMaterial.uniforms.uTime.value = 8;
    finalPass.uniforms.uAberration.value = 0;
    render();
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
      pointer.tx = x;
      pointer.ty = y;
    },
    setScroll(progress) {
      scrollTarget = progress;
      if (reducedMotion) {
        fieldMaterial.uniforms.uScroll.value = progress;
        render();
      }
    },
    setVelocity(value) {
      if (reducedMotion) return;
      velocityTarget = Math.max(-3, Math.min(3, value));
    },
    setReveal(value) {
      revealTarget = value;
    },
    resize,
    dispose() {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
      coreGeometry.dispose();
      coreMaterial.dispose();
      scaffoldSource.dispose();
      scaffoldGeometry.dispose();
      scaffoldMaterial.dispose();
      fieldGeometry.dispose();
      fieldMaterial.dispose();
      bloomPass?.dispose();
      finalPass.dispose();
      composer.dispose();
      renderer.dispose();
    },
  };
}
