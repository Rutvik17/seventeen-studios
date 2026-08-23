/**
 * The studio: an environment to reflect, and a camera that knows where to look.
 *
 * ---
 *
 * WHY THERE IS AN ENVIRONMENT MAP AT ALL
 *
 * Physically-based metal has NO diffuse term. All of its colour is reflection,
 * so a material at `metalness: 0.9` in a scene with nothing to reflect renders
 * black — not dark, black — no matter how many lights are pointed at it. Six of
 * this model's eighteen materials are metals: the ENIG gold pads, the forty gold
 * GPIO pins, the copper pour, the brushed aluminium shells on every connector.
 * Without an environment they are all silhouettes, and the board looks like the
 * flat grey Blender preview it was exported from.
 *
 * The usual answer is to download an HDRI. That is not available here: the site
 * is a static export with a strict "nothing invented, nothing fetched" posture,
 * and an environment probe is one more megabyte for a picture of somebody
 * else's photographic studio.
 *
 * So the studio is BUILT — a graded backdrop and three softboxes, rendered once
 * into a cube map through `PMREMGenerator`, which is the same prefiltered
 * mip-chain three.js would produce from a real HDRI. It costs about thirty
 * milliseconds at mount, nothing thereafter, and ships as roughly forty lines
 * instead of a megabyte.
 *
 * ---
 *
 * WHY THE BACKDROP IS PAPER AND NOT A DARK VIGNETTE
 *
 * The obvious way to light electronics is a black studio with hard rim lights,
 * and it is the wrong choice here for two reasons. The site is warm paper
 * (`--bg: #eceae4`) from top to bottom, so a black hero would be a hole in it.
 * And the e-ink panel is a DIFFUSE WHITE SURFACE that emits nothing: on a dark
 * set it would be the brightest thing in frame and read as a backlit screen,
 * which is precisely the lie this page is built to avoid. On paper it reads as
 * what it is — paper, with ink on it.
 */

import * as THREE from 'three';

/* ------------------------------------------------------------------ *
 * The environment
 * ------------------------------------------------------------------ */

const BACKDROP_VERTEX = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    vDirection = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/*
  A three-stop vertical gradient, evaluated per fragment on the sphere's own
  direction. The exponents are what stop it reading as a linear ramp: light from
  a real ceiling falls off fast just above the horizon and slowly higher up.
*/
const BACKDROP_FRAGMENT = /* glsl */ `
  uniform vec3 uSky;
  uniform vec3 uHorizon;
  uniform vec3 uFloor;
  varying vec3 vDirection;

  void main() {
    float h = normalize(vDirection).y;
    vec3 colour = h > 0.0
      ? mix(uHorizon, uSky, pow(h, 0.55))
      : mix(uHorizon, uFloor, pow(-h, 0.42));
    gl_FragColor = vec4(colour, 1.0);
  }
`;

/**
 * A light source, as a shape rather than as a point.
 *
 * The reason a softbox is a rectangle and not a bulb is the only reason it
 * matters here too: a metal surface reflects the SHAPE of what is lighting it.
 * A point light leaves a dot on a gold pad; a rectangle leaves a bar, which is
 * what a photograph of a circuit board actually looks like. These panels are
 * never seen directly — they exist only in the reflections.
 */
type Softbox = {
  position: [number, number, number];
  /** Width and height, in the same units as the scene. */
  size: [number, number];
  /** Radiance. Above 1 on purpose: this is rendered to a half-float target. */
  intensity: number;
  colour: number;
};

const SOFTBOXES: Softbox[] = [
  // Key, high and to the left, large enough to wrap the connector shells.
  { position: [-3.4, 4.6, 2.6], size: [7, 5], intensity: 7.5, colour: 0xfff6e8 },
  // Fill, opposite and weaker, so the shadow side keeps its detail.
  { position: [4.2, 1.9, 1.4], size: [5, 4], intensity: 2.4, colour: 0xe8f1ff },
  // A long, low strip behind, which is what puts a bright edge along the top of
  // every aluminium can and separates the board from the backdrop.
  { position: [0.4, 1.4, -4.6], size: [9, 1.6], intensity: 5.0, colour: 0xffffff },
];

/**
 * Render the studio into a prefiltered environment map.
 *
 * The returned texture is owned by the caller and must be disposed when the
 * scene unmounts — a PMREM target is a render target, not an image, and leaking
 * one leaks GPU memory that the browser will not reclaim on navigation.
 */
export function buildEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const scene = new THREE.Scene();
  const disposables: { dispose(): void }[] = [];

  const backdropGeometry = new THREE.SphereGeometry(12, 40, 24);
  const backdropMaterial = new THREE.ShaderMaterial({
    vertexShader: BACKDROP_VERTEX,
    fragmentShader: BACKDROP_FRAGMENT,
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      // Warm paper above, a shade cooler and darker below, so the board picks up
      // a faint sky-blue on its upward faces and a warm bounce underneath. That
      // split is most of what makes a render read as photographed rather than
      // as shaded.
      uSky: { value: new THREE.Color(0xf6f4ee).multiplyScalar(1.5) },
      uHorizon: { value: new THREE.Color(0xe4e1d8).multiplyScalar(0.95) },
      uFloor: { value: new THREE.Color(0xb9b5aa).multiplyScalar(0.55) },
    },
  });
  scene.add(new THREE.Mesh(backdropGeometry, backdropMaterial));
  disposables.push(backdropGeometry, backdropMaterial);

  for (const box of SOFTBOXES) {
    const geometry = new THREE.PlaneGeometry(box.size[0], box.size[1]);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(box.colour).multiplyScalar(box.intensity),
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...box.position);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
    disposables.push(geometry, material);
  }

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  // The sigma is a blur applied before prefiltering. A little of it turns three
  // hard-edged rectangles into something that reads as a lit room rather than as
  // three rectangles, without losing the bar-shaped highlights that make the
  // metal work.
  const target = pmrem.fromScene(scene, 0.035, 0.1, 40);

  pmrem.dispose();
  for (const item of disposables) item.dispose();

  return target.texture;
}

/* ------------------------------------------------------------------ *
 * The camera
 * ------------------------------------------------------------------ */

/**
 * One shot: where the camera stands, and what it is looking at.
 *
 * The subject is named rather than given as coordinates. Every act focuses on a
 * NODE of the model, so the framing is derived from where that part actually is
 * once the asset has loaded — which means a re-export that nudges the display
 * 5 mm still frames the display. Typed coordinates would silently point the
 * camera at empty space.
 */
export type Shot = {
  /** Node to look at. Falls back to the assembly's centre when absent. */
  focus: string | null;
  /** Radians around the vertical axis. 0 looks along +Z toward the origin. */
  azimuth: number;
  /** Radians above the horizontal. The board lies flat, so this is mostly down. */
  elevation: number;
  /** Distance from the focus, in scene units — the assembly is ~2.2 wide. */
  distance: number;
  /** Vertical framing nudge, applied to the look-at point. */
  lift: number;
};

/**
 * The five shots, one per act.
 *
 * The board lies flat with its components facing up, which is the single fact
 * that decides all of these: everything is looked at from ABOVE, and the
 * question each act answers is only how steeply and from which side.
 *
 * Act five is the exception worth explaining. It is nearly overhead and square
 * on, because by then the panel is the subject and a panel seen at a slant is a
 * panel you cannot read. Every other act is deliberately oblique, so arriving at
 * a flat, symmetrical, orthographic-feeling frame reads as the story settling.
 */
export const SHOTS: Shot[] = [
  // 01 substrate — low and raking, so the bare laminate catches the key light
  // and the silkscreen is legible across it.
  { focus: 'PCB_RaspberryPi4_ModelB_85x56mm', azimuth: -0.62, elevation: 0.36, distance: 3.05, lift: 0.02 },
  // 02 silicon — pushed in over the middle of the board, looking down at the
  // three parts that arrive there.
  { focus: 'CPU_Broadcom_BCM2711', azimuth: -0.24, elevation: 0.68, distance: 1.72, lift: 0.0 },
  // 03 interfaces — swung round to the connector edge and pulled back, because
  // twelve parts land in this act and they land all over the board.
  { focus: 'PCB_RaspberryPi4_ModelB_85x56mm', azimuth: 0.74, elevation: 0.44, distance: 3.15, lift: 0.0 },
  // 04 the link — round to the far side, low, following the cable off the
  // header and across to the controller.
  { focus: 'EInk_SPI_Controller_PCB', azimuth: -1.32, elevation: 0.38, distance: 2.35, lift: 0.04 },
  // 05 the panel — square on and almost overhead. The screen is the subject and
  // it has to be readable.
  { focus: 'EInk_Paper_Panel', azimuth: -0.12, elevation: 1.18, distance: 1.5, lift: 0.0 },
];

/** Smoothstep — zero derivative at both ends, so a shot arrives without a jerk. */
const ease = (t: number): number => t * t * (3 - 2 * t);

const scratchA = new THREE.Vector3();
const scratchB = new THREE.Vector3();

/**
 * The shot at a given point in the story, blended between its neighbours.
 *
 * Progress runs 0..1 across the whole section and is mapped onto SHOTS.length−1
 * spans. Each span is eased independently rather than the whole curve being
 * eased once, which is what gives the camera a beat of stillness on every act
 * instead of one continuous sweep that never settles anywhere.
 */
export function shotAt(progress: number): Shot & { blend: number; index: number } {
  const spans = SHOTS.length - 1;
  const scaled = Math.max(0, Math.min(spans, progress * spans));
  const index = Math.min(spans - 1, Math.floor(scaled));
  const t = ease(scaled - index);

  const a = SHOTS[index];
  const b = SHOTS[index + 1];

  return {
    // The focus SNAPS at the halfway point rather than blending, because there
    // is no such thing as half of one node and half of another. The camera is
    // already moving when it happens, so the change of subject is not visible.
    focus: t < 0.5 ? a.focus : b.focus,
    azimuth: a.azimuth + (b.azimuth - a.azimuth) * t,
    elevation: a.elevation + (b.elevation - a.elevation) * t,
    distance: a.distance + (b.distance - a.distance) * t,
    lift: a.lift + (b.lift - a.lift) * t,
    blend: t,
    index,
  };
}

/**
 * Turn a shot into a camera position and a look-at point.
 *
 * Spherical, around the focus. Elevation is measured up from the horizontal
 * because that is how anyone describes a camera out loud ("about forty degrees
 * above it"), whereas the polar angle three.js uses internally is measured down
 * from straight up and is off by ninety degrees from every sentence you would
 * say about the shot.
 */
export function placeCamera(
  shot: Shot,
  root: THREE.Object3D,
  centre: THREE.Vector3,
  outPosition: THREE.Vector3,
  outTarget: THREE.Vector3,
): void {
  const node = shot.focus ? root.getObjectByName(shot.focus) : null;
  if (node) node.getWorldPosition(scratchA);
  else scratchA.copy(centre);

  outTarget.set(scratchA.x, scratchA.y + shot.lift, scratchA.z);

  const horizontal = Math.cos(shot.elevation) * shot.distance;
  scratchB.set(
    Math.sin(shot.azimuth) * horizontal,
    Math.sin(shot.elevation) * shot.distance,
    Math.cos(shot.azimuth) * horizontal,
  );
  outPosition.copy(outTarget).add(scratchB);
}
