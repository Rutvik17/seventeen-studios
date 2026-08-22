/**
 * An electronic-paper panel, rendered with a shader.
 *
 * Takes a three-state bitmap and paints it the way a real three-colour e-ink
 * display looks: matte, faintly granular, slightly imperfect at the edges, and
 * never quite black or quite white.
 *
 * ---
 *
 * WHAT MAKES E-INK LOOK LIKE E-INK
 *
 * It is not a screen and the difference is almost entirely about how light
 * behaves. A display emits; paper reflects. So the tell is not colour, it is
 * that e-ink has no glow, no black point, and a visible physical texture — and
 * every one of those is a thing a shader can do:
 *
 * 1. **Granularity.** The image is made of microcapsules roughly 40 µm across,
 *    each holding pigment in a clear fluid. They are visible: a large flat area
 *    is not flat, it is faintly mottled. This is the single strongest cue, and a
 *    clean fill is what makes a fake e-ink render look like a PNG.
 * 2. **No true black.** The dark pigment reflects several percent of the light
 *    hitting it, so "black" reads near #1a1a1a. Painting #000 looks like a hole.
 * 3. **No true white either.** The paper is a warm off-white, around #eae7de,
 *    because the capsule layer is slightly cloudy.
 * 4. **Soft capsule edges.** Pigment does not stop exactly at a pixel boundary,
 *    so an edge is very slightly ragged — sub-pixel, but the eye reads its
 *    absence as "vector graphic".
 * 5. **Ghosting.** Particles do not fully return, so a faint trace of the
 *    previous image survives a refresh. Real, universally complained about, and
 *    the detail nobody thinks to fake.
 *
 * ---
 *
 * WHY IT RENDERS ONCE AND NOT EVERY FRAME
 *
 * Because that is what the hardware does. A three-colour panel takes about
 * fifteen seconds to refresh and then holds its image with the power off, for
 * years. Running a render loop for it would burn a GPU on something whose entire
 * engineering premise is that it costs nothing to keep showing.
 *
 * So the panel is rendered once into an offscreen canvas and handed back as a
 * data URL, which the board drawing places as an ordinary image. That also side-
 * steps aligning a live canvas over a scaling SVG: the picture is simply part of
 * the drawing.
 */

import {
  DataTexture,
  Mesh,
  NearestFilter,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { Bitmap } from '../pixelfont';

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform sampler2D uBitmap;   // r channel holds the ink index, scaled to 0..1
  uniform sampler2D uGhost;    // the previous image, for the residue
  uniform vec2  uResolution;   // panel size in device pixels
  uniform vec3  uPalette[7];   // the seven states an ACeP capsule can hold
  uniform float uHasGhost;

  /* --- value noise, for the capsule texture ---------------------------- */

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    // Smoothstep interpolation. Linear leaves a visible diamond lattice, which
    // reads as a pattern rather than as a material.
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  /*
    Two octaves of noise at very different scales, which is what the real
    material looks like: individual capsules, plus slow variation across the
    sheet from how they settled. One octave alone reads as film grain.
  */
  float capsules(vec2 uv) {
    float fine = valueNoise(uv * uResolution * 1.7);
    float broad = valueNoise(uv * 26.0);
    return fine * 0.72 + broad * 0.28;
  }

  void main() {
    vec2 texel = 1.0 / uResolution;

    /*
      Jitter the sample position by a fraction of a pixel before reading the
      bitmap. Because the texture is NEAREST-filtered, a sub-pixel offset near an
      edge occasionally lands on the neighbouring cell — so edges come out very
      slightly ragged, exactly as pigment that does not stop on a boundary does.
      Sampling straight gives a mathematically perfect edge, which is the thing
      that says "vector" rather than "physical".
    */
    float wobble = (capsules(vUv * 2.31) - 0.5) * 0.55;
    vec2 sampleUv = vUv + vec2(wobble, -wobble) * texel;

    float state = texture2D(uBitmap, sampleUv).r;

    /*
      Seven discrete states, resolved by rounding rather than blended. The panel
      has no intermediate state to blend toward — a capsule is driven to one
      colour or another — so any value between two indices is a sampling
      artefact and has to snap.
    */
    int index = int(floor(state * 6.0 + 0.5));
    vec3 colour = uPalette[0];
    for (int i = 0; i < 7; i++) {
      if (i == index) colour = uPalette[i];
    }

    /*
      Ghosting. A faint residue of the previous image, and only where the panel
      is now PAPER — pigment that failed to return is visible against white and
      invisible under fresh ink.
    */
    if (uHasGhost > 0.5 && index == 0) {
      float previous = texture2D(uGhost, vUv).r;
      if (previous > 0.08) colour = mix(colour, uPalette[1], 0.055);
    }

    // The capsule texture, applied as a small multiplicative variation. It has
    // to touch ink and paper alike: darken only the paper and the ink reads as
    // a sticker laid on top of the material rather than as part of it.
    float grain = capsules(vUv);
    colour *= 0.965 + grain * 0.07;

    /*
      A whisper of vignette. Every e-ink panel sits under a plastic frame that
      shadows its own edge, and the module's front light guide is never quite
      even. Two percent — enough to feel, not enough to notice.
    */
    vec2 d = vUv - 0.5;
    colour *= 1.0 - dot(d, d) * 0.11;

    gl_FragColor = vec4(colour, 1.0);
  }
`;

export type EinkPalette = [number, number, number][];

/**
 * The seven colours an ACeP panel can actually produce.
 *
 * Deliberately desaturated. These are pigments, not backlit phosphors — they
 * reflect ambient light and can only ever return a fraction of it, so the red
 * is a brick rather than a signal red and the green is closer to sage than to
 * anything a screen would show. Using vivid values would draw a display nobody
 * has ever held.
 *
 * Order matters: it is the controller's own index order, and the bitmap stores
 * these indices directly.
 */
export const ACEP_PALETTE: EinkPalette = [
  [0.918, 0.906, 0.871], // 0 paper — warm off-white, the capsule layer is cloudy
  [0.102, 0.102, 0.11],  // 1 black — reflects a few percent, never a true black
  [0.690, 0.227, 0.180], // 2 red
  [0.247, 0.478, 0.290], // 3 green
  [0.169, 0.290, 0.541], // 4 blue
  [0.788, 0.635, 0.153], // 5 yellow
  [0.788, 0.416, 0.118], // 6 orange
];

/**
 * Render a bitmap as an e-ink panel and return it as a PNG data URL.
 *
 * `scale` is how many output pixels per panel pixel. Three is enough for the
 * capsule texture to be visible without the image weighing more than the rest
 * of the page.
 */
export function renderEink(
  bitmap: Bitmap,
  options: { scale?: number; ghost?: Bitmap | null; palette?: EinkPalette } = {},
): string | null {
  const scale = options.scale ?? 2;
  const palette = options.palette ?? ACEP_PALETTE;

  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width * scale;
  canvas.height = bitmap.height * scale;

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false });
  } catch {
    // No WebGL. The caller falls back to drawing the bitmap plainly.
    return null;
  }

  renderer.setPixelRatio(1);
  renderer.setSize(canvas.width, canvas.height, false);

  const toTexture = (source: Bitmap) => {
    const rgba = new Uint8Array(source.width * source.height * 4);
    for (let i = 0; i < source.data.length; i++) {
      // Ink index spread across the byte range so the shader can recover it by
      // rounding. Six steps, not seven, because index 0 maps to 0 and index 6
      // to 255.
      const v = Math.round((source.data[i] / 6) * 255);
      rgba[i * 4] = v;
      rgba[i * 4 + 3] = 255;
    }
    const texture = new DataTexture(rgba, source.width, source.height, RGBAFormat);
    // NEAREST both ways: a bitmap font that gets bilinear filtering turns to
    // mush, and the sub-pixel wobble above depends on hard cell boundaries.
    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.flipY = true;
    texture.needsUpdate = true;
    return texture;
  };

  const bitmapTexture = toTexture(bitmap);
  const ghostTexture = options.ghost ? toTexture(options.ghost) : toTexture(bitmap);

  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uBitmap: { value: bitmapTexture },
      uGhost: { value: ghostTexture },
      uResolution: { value: [bitmap.width, bitmap.height] },
      uPalette: { value: palette.map((c) => new Vector3(...c)) },
      uHasGhost: { value: options.ghost ? 1 : 0 },
    },
  });

  const scene = new Scene();
  scene.add(new Mesh(new PlaneGeometry(2, 2), material));
  // A unit orthographic camera over a 2×2 plane is the standard fullscreen-quad
  // setup: no projection maths, uv runs 0…1 across the output exactly.
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  renderer.render(scene, camera);
  const url = canvas.toDataURL('image/png');

  // One-shot: everything is disposed immediately. A WebGL context left open per
  // panel would exhaust the browser's limit (usually 8–16) on a page with
  // several of them.
  bitmapTexture.dispose();
  ghostTexture.dispose();
  material.dispose();
  renderer.dispose();

  return url;
}
