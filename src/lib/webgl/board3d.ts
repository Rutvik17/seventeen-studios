/**
 * The board, in three dimensions, with hotspots you can click.
 *
 * Built from the SAME bill of materials as the flat drawing on the landing page
 * (`lib/board.ts`), so a component's position, package and size exist in one
 * place and the two views cannot disagree. Moving a part on the landing moves
 * it here.
 *
 * ---
 *
 * WHY THREE.JS HERE AND SVG THERE
 *
 * The landing wants a schematic: flat, crisp, dimensioned, readable at a
 * glance. That is SVG's job and WebGL would only make it blurrier.
 *
 * This wants the opposite. It is an object you turn over to understand — a
 * regulator is a tiny black slab and the module is a tall metal can, and that
 * difference in *height* is most of what tells you which is which. You cannot
 * show height on a plan view, and faking it with drop shadows looks like a
 * drawing of a board rather than a board.
 *
 * ---
 *
 * HOTSPOTS ARE HTML, NOT SPRITES
 *
 * The labels are DOM elements positioned each frame by projecting a 3D point to
 * screen space. Drawing them into the canvas would be easier and would make
 * every one of them invisible to a screen reader, unselectable, and unable to
 * take keyboard focus — for an explainer whose entire purpose is the labels,
 * that is the wrong trade at any price.
 *
 * The projection is `Vector3.project(camera)`, which returns normalised device
 * coordinates in −1…1; the caller maps those to pixels.
 */

import {
  ACESFilmicToneMapping,
  AmbientLight,
  BoxGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  PMREMGenerator,
  PerspectiveCamera,
  Raycaster,
  SRGBColorSpace,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { BOARD, COMPONENTS, NETS, routePath } from '../board';

/** Height above the board, in mm, for each package family. */
function partHeight(pkg: string): number {
  if (pkg === 'Module') return 2.4;
  if (pkg.startsWith('SOT')) return 1.1;
  if (pkg === '16P' || pkg === 'B2B-PH' || pkg === 'FH12') return 3.2;
  if (pkg === '3215') return 0.9;
  if (pkg === '4.2×3.2') return 1.8;
  return 0.55; // 0402 / 0603 passives
}

export type Hotspot = {
  ref: string;
  /** Where the label's leader should point, in world space. */
  anchor: Vector3;
  /** Filled each frame: screen position in pixels, and whether it faces us. */
  screen: { x: number; y: number; visible: boolean };
};

export type Board3DHandle = {
  hotspots: Hotspot[];
  /** Call each frame after render; updates every hotspot's screen position. */
  project: (width: number, height: number) => void;
  /** Ref of the part under the pointer, or null. */
  pick: (x: number, y: number, width: number, height: number) => string | null;
  focus: (ref: string | null) => void;
  resize: (width: number, height: number) => void;
  start: () => void;
  stop: () => void;
  renderOnce: () => void;
  dispose: () => void;
};

export function createBoard3D(
  canvas: HTMLCanvasElement,
  palette: {
    mask: string;
    copper: string;
    body: string;
    accent: string;
  },
): Board3DHandle {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;

  const camera = new PerspectiveCamera(34, 1, 0.1, 1000);

  scene.add(new AmbientLight(0xffffff, 0.5));
  const key = new DirectionalLight(0xffffff, 2.2);
  key.position.set(40, 90, 60);
  scene.add(key);
  const fill = new DirectionalLight(0xffffff, 0.7);
  fill.position.set(-50, 30, -40);
  scene.add(fill);

  /*
    The whole board is built centred on the origin, so orbiting rotates it about
    its own middle. Building it at the millimetre coordinates from `board.ts` and
    rotating would swing it around a corner instead.
  */
  const root = new Group();
  const cx = BOARD.width / 2;
  const cy = BOARD.height / 2;
  scene.add(root);

  /** mm → world, with the board's centre at the origin and Y up. */
  const place = (x: number, y: number, z = 0) => new Vector3(x - cx, z, y - cy);

  /* ---------------- substrate ---------------- */

  const substrate = new Mesh(
    new BoxGeometry(BOARD.width, BOARD.thickness, BOARD.height),
    new MeshStandardMaterial({
      color: new Color(palette.mask),
      roughness: 0.55,
      metalness: 0.05,
    }),
  );
  substrate.position.y = -BOARD.thickness / 2;
  root.add(substrate);

  /* ---------------- copper ---------------- */

  /*
    Traces are thin boxes laid on the surface, one per straight segment of the
    routed path — which is why `routePath` is reused rather than re-derived.
    Extruding a stroked path properly would need a geometry library for
    something the eye reads as a flat line from any angle a reader will use.
  */
  const copperMat = new MeshStandardMaterial({
    color: new Color(palette.copper),
    roughness: 0.32,
    metalness: 0.85,
  });

  for (const net of NETS) {
    const d = routePath(net.points);
    const pts = d
      .split(/(?=[ML])/)
      .map((seg) => seg.trim().slice(1).trim().split(/\s+/).map(Number))
      .filter((p) => p.length === 2 && p.every(Number.isFinite));

    const width = net.kind === 'signal' ? 0.28 : 0.5;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const len = Math.hypot(x1 - x0, y1 - y0);
      if (len < 0.01) continue;
      const seg = new Mesh(new BoxGeometry(len, 0.035, width), copperMat);
      seg.position.copy(place((x0 + x1) / 2, (y0 + y1) / 2, 0.018));
      // atan2 gives the angle in the XZ plane; negated because screen-y grows
      // downward in the source data and world-z grows toward the viewer.
      seg.rotation.y = -Math.atan2(y1 - y0, x1 - x0);
      root.add(seg);
    }
  }

  /* ---------------- components ---------------- */

  const bodyMat = new MeshStandardMaterial({
    color: new Color(palette.body),
    roughness: 0.45,
    metalness: 0.15,
  });
  const padMat = new MeshStandardMaterial({
    color: new Color(palette.copper),
    roughness: 0.3,
    metalness: 0.9,
  });

  const picked = new Map<number, string>();
  const hotspots: Hotspot[] = [];
  const partMeshes = new Map<string, Mesh>();

  for (const c of COMPONENTS) {
    const w = c.rot === 90 ? c.h : c.w;
    const d = c.rot === 90 ? c.w : c.h;
    const h = partHeight(c.package);

    const pad = new Mesh(new BoxGeometry(w + 0.9, 0.04, d + 0.9), padMat);
    pad.position.copy(place(c.x, c.y, 0.02));
    root.add(pad);

    const body = new Mesh(new BoxGeometry(w, h, d), bodyMat.clone());
    body.position.copy(place(c.x, c.y, h / 2 + 0.04));
    body.userData.ref = c.ref;
    picked.set(body.id, c.ref);
    partMeshes.set(c.ref, body);
    root.add(body);

    // Pin-1 marker on the parts that have an orientation, because that dot is
    // the entire difference between a working board and a dead one.
    if (c.polarised) {
      const dot = new Mesh(
        new CylinderGeometry(0.35, 0.35, 0.05, 12),
        new MeshStandardMaterial({ color: new Color('#e8efe9'), roughness: 0.6 }),
      );
      dot.position.copy(place(c.x - w / 2 + 1.1, c.y - d / 2 + 1.1, h + 0.06));
      root.add(dot);
    }

    hotspots.push({
      ref: c.ref,
      anchor: place(c.x, c.y, h + 0.5),
      screen: { x: 0, y: 0, visible: false },
    });
  }

  /* ---------------- interaction ---------------- */

  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const focusColor = new Color(palette.accent);
  const baseColor = new Color(palette.body);
  let focused: string | null = null;

  const setFocus = (ref: string | null) => {
    if (focused === ref) return;
    focused = ref;
    for (const [key, mesh] of partMeshes) {
      const mat = mesh.material as MeshStandardMaterial;
      mat.color.copy(key === ref ? focusColor : baseColor);
      mat.emissive.copy(key === ref ? focusColor : new Color(0x000000));
      mat.emissiveIntensity = key === ref ? 0.25 : 0;
    }
  };

  /* ---------------- camera + loop ---------------- */

  const orbit = { theta: -0.6, phi: 0.95, radius: 132 };
  const target = { theta: -0.6, phi: 0.95 };
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  const onDown = (e: PointerEvent) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  };
  const onUp = () => {
    dragging = false;
  };
  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    target.theta -= (e.clientX - lastX) * 0.006;
    // Clamped well short of the poles: at the top the board is edge-on and
    // becomes an invisible line, and past it the scene flips.
    target.phi = Math.min(1.45, Math.max(0.25, target.phi - (e.clientY - lastY) * 0.005));
    lastX = e.clientX;
    lastY = e.clientY;
  };

  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointermove', onMove);

  const applyCamera = () => {
    orbit.theta += (target.theta - orbit.theta) * 0.09;
    orbit.phi += (target.phi - orbit.phi) * 0.09;
    camera.position.set(
      Math.sin(orbit.phi) * Math.cos(orbit.theta) * orbit.radius,
      Math.cos(orbit.phi) * orbit.radius,
      Math.sin(orbit.phi) * Math.sin(orbit.theta) * orbit.radius,
    );
    camera.lookAt(0, 0, 0);
  };

  let raf = 0;
  let running = false;

  const draw = () => {
    applyCamera();
    renderer.render(scene, camera);
  };

  const frame = () => {
    if (!running) return;
    draw();
    raf = requestAnimationFrame(frame);
  };

  const resize = (width: number, height: number) => {
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(1, height);
    // Pull back when the frame is narrow, or a phone crops the board's ends.
    orbit.radius = camera.aspect < 1 ? 190 : 132;
    camera.updateProjectionMatrix();
  };

  return {
    hotspots,
    project: (width, height) => {
      const v = new Vector3();
      const forward = new Vector3();
      camera.getWorldDirection(forward);
      for (const spot of hotspots) {
        v.copy(spot.anchor).project(camera);
        spot.screen.x = (v.x * 0.5 + 0.5) * width;
        spot.screen.y = (-v.y * 0.5 + 0.5) * height;
        // `project` happily returns coordinates for points behind the camera —
        // they come back mirrored, so a label from the far side of the board
        // would appear on the wrong edge. z < 1 is the near/far test.
        spot.screen.visible = v.z < 1;
      }
    },
    pick: (x, y, width, height) => {
      pointer.set((x / width) * 2 - 1, -(y / height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(root.children, false);
      for (const hit of hits) {
        const ref = picked.get(hit.object.id);
        if (ref) return ref;
      }
      return null;
    },
    focus: setFocus,
    resize,
    start: () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(frame);
    },
    stop: () => {
      running = false;
      cancelAnimationFrame(raf);
    },
    renderOnce: () => {
      // Snap straight to the target so a single frame is not caught mid-ease.
      orbit.theta = target.theta;
      orbit.phi = target.phi;
      draw();
    },
    dispose: () => {
      running = false;
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointermove', onMove);
      scene.traverse((o) => {
        const m = o as Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) {
          const mat = m.material;
          Array.isArray(mat) ? mat.forEach((x) => x.dispose()) : mat.dispose();
        }
      });
      envRT.texture.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
