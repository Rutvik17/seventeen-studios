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
 * The camera — assembler at a table
 * ------------------------------------------------------------------ */

/**
 * One person, sitting at a bench, looking down at a board on the table.
 *
 * The previous camera orbited the device and re-parented its look-at onto
 * whichever part was arriving. That is why the board dove out of the frame,
 * shrank when the cable came in, and showed the panel upside down: the
 * "camera" was a drone, not a body. An assembler does not walk around the
 * table between the CPU and the USB stack. He sits, he leans in, and when
 * the screen arrives he glances toward it.
 *
 * Azimuth is locked. Elevation and distance only move as a person would:
 * walk up (board grows in frame), sit, work, lean toward the panel.
 */

const ease = (t: number): number => t * t * (3 - 2 * t);
const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);

/** HDMI/power edge toward the assembler. GPIO at the far side of the table. */
const AZIMUTH = 0.18;

const scratchB = new THREE.Vector3();

export type AssemblerPose = {
  azimuth: number;
  elevation: number;
  distance: number;
  /** 0 = board centre, 1 = the panel. */
  glance: number;
};

/**
 * The head at a given point in the story.
 *
 * 0.00–0.22  walk up to the table (board starts small, grows)
 * 0.22–0.78  seated, locked — this is the assembly
 * 0.78–1.00  lean toward the screen
 */
export function assemblerAt(progress: number): AssemblerPose {
  const sit = ease(clamp01(progress / 0.22));
  const glance = ease(clamp01((progress - 0.78) / 0.22));

  return {
    azimuth: AZIMUTH,
    // ~47° walking up, ~38° seated. The glance does not dive — it only
    // softens a few degrees so the glass is more in front of you.
    elevation: 0.84 - sit * 0.18 - glance * 0.04,
    // Walk in (board grows). When the panel arrives the subject gets wider,
    // so the head eases back a little rather than cropping the Pi off the table.
    distance: 4.05 - sit * 1.45 + glance * 0.5,
    glance,
  };
}

/**
 * Turn the pose into a camera position and a look-at point.
 *
 * `centre` is the board. `panel` is the glass, used only as the glance
 * destination — we lerp toward it, we never snap the orbit origin onto it.
 */
export function placeAssembler(
  pose: AssemblerPose,
  centre: THREE.Vector3,
  panel: THREE.Vector3 | null,
  outPosition: THREE.Vector3,
  outTarget: THREE.Vector3,
): void {
  if (panel && pose.glance > 0) {
    outTarget.lerpVectors(centre, panel, pose.glance * 0.28);
  } else {
    outTarget.copy(centre);
  }
  outTarget.y += 0.03;

  const horizontal = Math.cos(pose.elevation) * pose.distance;
  scratchB.set(
    Math.sin(pose.azimuth) * horizontal,
    Math.sin(pose.elevation) * pose.distance,
    Math.cos(pose.azimuth) * horizontal,
  );
  outPosition.copy(outTarget).add(scratchB);
}
