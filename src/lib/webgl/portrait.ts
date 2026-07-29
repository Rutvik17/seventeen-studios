/**
 * Portrait shader.
 *
 * A single textured plane whose UVs are displaced by simplex noise, with the
 * displacement concentrated around the pointer so the image ripples where you
 * touch it and settles everywhere else.
 *
 * The grade keeps the photograph's own colour and simply seats it at the page's
 * exposure. The source already carries a red and cyan chromatic split — that is
 * the most striking thing about it, so this shader adds no separation of its own
 * and does not flatten it to a duotone.
 *
 * The reveal is a vertical wipe driven from outside, so it can be sequenced
 * against the rest of the page entrance.
 */

import {
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  TextureLoader,
  Vector2,
  WebGLRenderer,
  SRGBColorSpace,
  type Texture,
} from 'three';
import { ACCENT_HEX, BG_HEX } from '../tokens';

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = /* glsl */ `
precision highp float;

uniform sampler2D uTexture;
uniform vec2  uPointer;      // 0..1 in plane space
uniform float uHover;        // eased 0..1
uniform float uTime;
uniform float uReveal;       // 0..1 wipe
uniform vec2  uCover;        // aspect-fit correction
uniform vec3  uAccent;
uniform vec3  uShadow;

varying vec2 vUv;

// Compact 2D simplex noise (Ashima, MIT).
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}
float snoise(vec2 v){
  const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
  vec2 i=floor(v+dot(v,C.yy));
  vec2 x0=v-i+dot(i,C.xx);
  vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
  vec4 x12=x0.xyxy+C.xxzz;
  x12.xy-=i1;
  i=mod289(i);
  vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
  vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
  m=m*m; m=m*m;
  vec3 x=2.0*fract(p*C.www)-1.0;
  vec3 h=abs(x)-0.5;
  vec3 ox=floor(x+0.5);
  vec3 a0=x-ox;
  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
  vec3 g;
  g.x=a0.x*x0.x+h.x*x0.y;
  g.yz=a0.yz*x12.xz+h.yz*x12.yw;
  return 130.0*dot(m,g);
}

void main() {
  // Cover-fit: keep the subject's proportions whatever box the layout gives us.
  vec2 uv = (vUv - 0.5) * uCover + 0.5;

  // Distance to the pointer drives how much the surface moves.
  float d = distance(uv, uPointer);
  float focus = smoothstep(0.42, 0.0, d) * uHover;

  // Low frequency, tiny amplitude: the surface should breathe, not smear. The
  // photograph already carries a chromatic split of its own, so this shader
  // adds no colour separation — doubling it just muddies the subject.
  float n = snoise(uv * 2.2 + uTime * 0.1);
  float n2 = snoise(uv * 4.2 - uTime * 0.07);
  vec2 offset = vec2(n, n2) * (0.0008 + focus * 0.006);

  vec3 src = texture2D(uTexture, uv + offset).rgb;

  // The photograph keeps its own colour. An earlier version keyed the studio
  // backdrop out to let the page show through; against a backdrop that is
  // itself a gradient, in linear space, the threshold drifted and left a
  // mottled ghost. Grading the whole frame down is less clever and holds up.
  float luma = dot(src, vec3(0.299, 0.587, 0.114));
  vec3 color = pow(src, vec3(1.34));

  // Sink the frame into the page: strong corner falloff, and the top-right
  // backdrop pulled furthest down since that is where it is brightest.
  float vignette = smoothstep(1.05, 0.3, distance(vUv, vec2(0.46, 0.42)));
  color = mix(uShadow, color, 0.16 + vignette * 0.84);

  // The accent answers the cursor, picking up only on lit areas.
  color = mix(color, uAccent, focus * 0.18 * smoothstep(0.4, 0.9, luma));

  // Fine grain so the portrait carries the same texture as the page.
  float grain = fract(sin(dot(vUv + fract(uTime * 0.5), vec2(12.9898, 78.233))) * 43758.5453);
  color += (grain - 0.5) * 0.03;

  // Reveal wipe, bottom to top, with a soft leading edge.
  float wipe = smoothstep(uReveal - 0.16, uReveal + 0.02, 1.0 - vUv.y);
  gl_FragColor = vec4(color, 1.0 - wipe);
}`;

export interface PortraitHandle {
  /**
   * False when the shader program failed to link. The caller must keep the
   * fallback <img> visible in that case — otherwise a shader bug renders an
   * empty box where the portrait should be.
   */
  ok: boolean;
  setPointer(x: number, y: number): void;
  setHover(active: boolean): void;
  setReveal(value: number): void;
  resize(): void;
  dispose(): void;
}

export function createPortrait(
  canvas: HTMLCanvasElement,
  src: string,
  options: { reducedMotion?: boolean } = {},
): PortraitHandle {
  const { reducedMotion = false } = options;

  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true });
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0, 1);

  const material = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    uniforms: {
      uTexture: { value: null as Texture | null },
      uPointer: { value: new Vector2(0.5, 0.5) },
      uHover: { value: 0 },
      uTime: { value: 0 },
      uReveal: { value: reducedMotion ? 1 : 0 },
      uCover: { value: new Vector2(1, 1) },
      uAccent: { value: hexToVec(ACCENT_HEX) },
      uShadow: { value: hexToVec(BG_HEX) },
    },
  });

  const mesh = new Mesh(new PlaneGeometry(1, 1), material);
  scene.add(mesh);

  let imageAspect = 1;
  const loader = new TextureLoader();
  loader.load(src, (texture) => {
    texture.colorSpace = SRGBColorSpace;
    material.uniforms.uTexture.value = texture;
    imageAspect = texture.image.width / texture.image.height;
    resize();
    if (reducedMotion) render();
  });

  const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
  let hover = 0;
  let hoverTarget = 0;
  let reveal = reducedMotion ? 1 : 0;
  let revealTarget = reducedMotion ? 1 : 0;
  let elapsed = 0;
  let last = performance.now();
  let raf = 0;

  function resize() {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);

    // Cover-fit correction so the portrait never stretches.
    const boxAspect = width / height;
    const cover = material.uniforms.uCover.value as Vector2;
    if (boxAspect > imageAspect) {
      cover.set(1, imageAspect / boxAspect);
    } else {
      cover.set(boxAspect / imageAspect, 1);
    }
  }

  function render() {
    renderer.render(scene, camera);
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const delta = Math.min((now - last) / 1000, 0.05);
    last = now;
    elapsed += delta;

    pointer.x += (pointer.tx - pointer.x) * 0.09;
    pointer.y += (pointer.ty - pointer.y) * 0.09;
    hover += (hoverTarget - hover) * 0.08;
    reveal += (revealTarget - reveal) * 0.06;

    material.uniforms.uTime.value = elapsed;
    material.uniforms.uHover.value = hover;
    material.uniforms.uReveal.value = reveal;
    (material.uniforms.uPointer.value as Vector2).set(pointer.x, pointer.y);

    render();
  }

  resize();

  // Link the program up front and ask Three whether it succeeded. Diagnostics
  // are only populated on failure.
  renderer.compile(scene, camera);
  const program = (material as unknown as { program?: { diagnostics?: unknown } }).program;
  const ok = !program?.diagnostics;

  if (!ok) {
    renderer.dispose();
    return {
      ok: false,
      setPointer() {},
      setHover() {},
      setReveal() {},
      resize() {},
      dispose() {},
    };
  }

  if (reducedMotion) render();
  else raf = requestAnimationFrame(frame);

  return {
    ok: true,
    setPointer(x, y) {
      if (reducedMotion) return;
      pointer.tx = x;
      pointer.ty = y;
    },
    setHover(active) {
      if (reducedMotion) return;
      hoverTarget = active ? 1 : 0;
    },
    setReveal(value) {
      revealTarget = value;
      if (reducedMotion) {
        material.uniforms.uReveal.value = value;
        render();
      }
    },
    resize,
    dispose() {
      cancelAnimationFrame(raf);
      (material.uniforms.uTexture.value as Texture | null)?.dispose();
      material.dispose();
      mesh.geometry.dispose();
      renderer.dispose();
    },
  };
}

function hexToVec(hex: number): Vector3Like {
  return {
    x: ((hex >> 16) & 255) / 255,
    y: ((hex >> 8) & 255) / 255,
    z: (hex & 255) / 255,
    // Three accepts any {x,y,z} for a vec3 uniform.
  } as Vector3Like;
}

interface Vector3Like {
  x: number;
  y: number;
  z: number;
}
