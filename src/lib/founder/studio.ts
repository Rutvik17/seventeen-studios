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
import { actRange } from './device';

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
      /*
        Warm paper above, falling to a much darker floor below.

        THE RANGE BETWEEN THESE THREE IS WHAT GIVES METAL ITS FORM. A metal has
        no diffuse term — every tone on it is something in this gradient, seen
        by reflection. With the floor set close to the sky (it was 0.55 against
        1.5) an upward face and a sideways face reflect nearly the same value,
        so a connector shell comes out one flat tone and reads as painted
        plastic. Dropping the horizon and the floor puts a dark band around the
        sides of every shell and leaves the key light on top, which is the whole
        of what makes brushed metal legible.
      */
      uSky: { value: new THREE.Color(0xf6f4ee).multiplyScalar(1.45) },
      uHorizon: { value: new THREE.Color(0xd8d5cb).multiplyScalar(0.6) },
      uFloor: { value: new THREE.Color(0x8d8a82).multiplyScalar(0.28) },
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
  { focus: 'PCB_RaspberryPi4_ModelB_85x56mm', azimuth: -0.62, elevation: 0.42, distance: 2.45, lift: 0.02 },
  // 02 silicon — pushed in over the middle of the board, looking down at the
  // three parts that arrive there.
  { focus: 'CPU_Broadcom_BCM2711', azimuth: -0.28, elevation: 0.72, distance: 1.42, lift: 0.0 },
  // 03 interfaces — swung round to the connector edge and pulled back, because
  // twelve parts land in this act and they land all over the board.
  { focus: 'PCB_RaspberryPi4_ModelB_85x56mm', azimuth: 0.58, elevation: 0.5, distance: 2.55, lift: 0.0 },
  // 04 the link — round to the far side, following the cable off the header
  // and across to the controller.
  { focus: 'EInk_SPI_Controller_PCB', azimuth: -1.15, elevation: 0.46, distance: 2.2, lift: 0.04 },
  /*
    05 the panel — close, and nearly square on.

    Framed on the PAPER rather than on the module, because the subject of this
    act is the image and not the bezel around it. Every other shot is
    deliberately oblique, so arriving at something this flat reads as the story
    settling.

    The elevation is the number that matters. The board lies face up, so the
    panel does too, and a display seen at a slant is a display nobody can read —
    which would waste the one act the whole page builds toward. Just off square
    rather than dead overhead, so it still reads as an object on a table.
  */
  { focus: 'EInk_Paper_Panel', azimuth: -0.34, elevation: 0.98, distance: 1.82, lift: 0.0 },
];

/** Smoothstep — zero derivative at both ends, so a shot arrives without a jerk. */
const ease = (t: number): number => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

const scratchA = new THREE.Vector3();
const scratchB = new THREE.Vector3();

/**
 * Where each shot's subject SITS WHEN IT IS FITTED.
 *
 * ==================================================================
 * THIS IS THE FIX FOR THE CAMERA JUMPING, AND IT IS THE WHOLE REASON
 * THE MAP EXISTS RATHER THAN A `getObjectByName` PER FRAME.
 * ==================================================================
 *
 * Every act frames a part. Every part, during its own act, is still flying in —
 * the display starts 125 mm to the left and 90 mm up, the controller starts
 * 80 mm out on two axes. Reading a focus node's LIVE world position therefore
 * aims the camera at something that is itself moving, and the two motions
 * compound: the subject swings across the frame, the camera chases it, and the
 * assembly lurches in and out of the canvas.
 *
 * That shipped, and it is what "the board is jumping so much, it even goes out
 * of canvas" was. It is invisible in the source — `getWorldPosition` is
 * obviously correct-looking — and unmissable the moment the page is scrolled.
 *
 * A camera operator frames where the part is GOING TO BE and lets it arrive
 * into the shot. So the anchors are captured once, while the model is still
 * fully seated as the GLB delivered it, and nothing after that can move them.
 */
export type Anchors = Map<string, THREE.Vector3>;

/**
 * Capture the seated position of every node any shot names.
 *
 * MUST be called while the model is assembled and after its world matrices are
 * up to date — that is, after the fit-to-view scale is applied and BEFORE the
 * parts are posed to their t = 0 exploded state. Calling it a few lines later
 * would capture the exploded positions, and the camera would spend the whole
 * page framing empty air where a part used to be.
 */
export function captureAnchors(root: THREE.Object3D): Anchors {
  root.updateMatrixWorld(true);
  const anchors: Anchors = new Map();
  for (const shot of SHOTS) {
    if (!shot.focus || anchors.has(shot.focus)) continue;
    const node = root.getObjectByName(shot.focus);
    if (node) anchors.set(shot.focus, node.getWorldPosition(new THREE.Vector3()));
  }
  return anchors;
}

/** Two shots and how far between them the story has got. */
export type ShotFrame = {
  from: Shot;
  to: Shot;
  /** Eased, 0 at `from`, 1 at `to`. */
  t: number;
  index: number;
};

/**
 * The shot at a given point in the story.
 *
 * Progress runs 0..1 across the whole section and is mapped onto SHOTS.length−1
 * spans. Each span is eased independently rather than the whole curve being
 * eased once, which is what gives the camera a beat of stillness on every act
 * instead of one continuous sweep that never settles anywhere.
 *
 * The pair is returned rather than a single blended shot, because the two
 * subjects have to be blended in WORLD SPACE by `placeCamera` — see the note
 * there on why picking one of the two names is not good enough.
 */
export function shotAt(progress: number): ShotFrame {
  /*
    The camera is driven by the ACT RANGES, not by an even division of the
    scroll. The acts are deliberately unequal — twelve connectors take longer
    than one bare board, and the last act is worth more than twice any other so
    the panel can be read — and a camera on equal fifths would drift out of step
    with the parts it is supposed to be framing, arriving at the display while
    the connectors were still landing.
  */
  const last = SHOTS.length - 1;
  let index = 0;
  for (let i = last; i >= 0; i -= 1) {
    if (progress >= actRange(i).start) {
      index = i;
      break;
    }
  }

  const { start, span } = actRange(index);
  const local = span > 0 ? (progress - start) / span : 1;

  /*
    HOLD, THEN MOVE. The camera sits on this act's framing while the act's parts
    arrive, and only travels to the next one over the closing third — which is
    what gives every act a beat of stillness instead of one continuous drift
    that never settles anywhere. The last act has nowhere to go, so it holds
    throughout: the panel is doing the work by then and a moving camera would be
    competing with it.
  */
  const HOLD = 0.68;
  const t = ease(Math.max(0, Math.min(1, (local - HOLD) / (1 - HOLD))));

  return {
    from: SHOTS[index],
    to: SHOTS[Math.min(index + 1, last)],
    t,
    index,
  };
}

/**
 * Turn a shot frame into a camera position and a look-at point.
 *
 * The look-at point is INTERPOLATED between the two subjects' seated anchors.
 * The earlier version picked whichever name was nearer — `t < 0.5 ? a : b` —
 * on the theory that there is no such thing as half of one node and half of
 * another. There is: the point half way between them, which is exactly what a
 * camera panning from one to the other looks at on the way. Choosing instead
 * teleports the target across the board at the midpoint of every transition,
 * and the damping downstream turns the teleport into a lurch rather than
 * removing it.
 *
 * Spherical, around that point. Elevation is measured up from the horizontal
 * because that is how anyone describes a camera out loud ("about forty degrees
 * above it"), whereas the polar angle three.js uses internally is measured down
 * from straight up and is off by ninety degrees from every sentence you would
 * say about the shot.
 */
/**
 * How much further back the camera has to stand at a given viewport shape.
 *
 * The shots' distances are tuned against a landscape window — about 1.6 wide
 * for every 1 tall. The vertical field of view is fixed, so the HORIZONTAL
 * extent the camera can see is `2·d·tan(fov/2)·aspect`: halve the aspect and
 * you halve the width in frame. On a portrait phone at 0.46 that is less than a
 * third of the width the framing was built for, and a board that fills the
 * desktop shot runs off both sides of the screen.
 *
 * Standing further back by the same ratio puts it back inside the frame. The
 * clamp matters in both directions: below 1 a very wide window would push the
 * camera in until the board overflowed vertically instead, and without a
 * ceiling a narrow enough window would retreat until the device was a speck.
 */
const REFERENCE_ASPECT = 1.6;

export function fitDistance(aspect: number): number {
  if (!Number.isFinite(aspect) || aspect <= 0) return 1;
  const scale = REFERENCE_ASPECT / aspect;
  return Math.max(1, Math.min(2.4, scale));
}

export function placeCamera(
  frame: ShotFrame,
  anchors: Anchors,
  centre: THREE.Vector3,
  outPosition: THREE.Vector3,
  outTarget: THREE.Vector3,
  distanceScale = 1,
): void {
  const { from, to, t } = frame;
  const a = (from.focus ? anchors.get(from.focus) : null) ?? centre;
  const b = (to.focus ? anchors.get(to.focus) : null) ?? centre;

  outTarget.set(
    mix(a.x, b.x, t),
    mix(a.y, b.y, t) + mix(from.lift, to.lift, t),
    mix(a.z, b.z, t),
  );

  const azimuth = mix(from.azimuth, to.azimuth, t);
  const elevation = mix(from.elevation, to.elevation, t);
  const distance = mix(from.distance, to.distance, t) * distanceScale;

  const horizontal = Math.cos(elevation) * distance;
  scratchB.set(
    Math.sin(azimuth) * horizontal,
    Math.sin(elevation) * distance,
    Math.cos(azimuth) * horizontal,
  );
  outPosition.copy(outTarget).add(scratchB);
  scratchA.set(0, 0, 0);
}
