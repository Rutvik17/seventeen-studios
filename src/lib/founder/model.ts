/**
 * The GLB, turned into something the scroll story can drive.
 *
 * Three jobs, all of them done once when the asset lands and never per frame:
 * find the parts, MEASURE them, and fix the materials.
 *
 * ---
 *
 * THE PARTS ARE FOUND, NOT LISTED
 *
 * Every independent root in the export carries glTF `extras` written by the
 * Blender pipeline:
 *
 *   webRole       "assembly_part"
 *   assemblyOrder integer, 0 for the bare PCB through 18 for the display
 *   explodeX/Y/Z  where the part sits before it is fitted, in metres
 *
 * So this file never names a node. Re-export the model with a connector added
 * and it joins the choreography on its own. The one name that IS hard-coded is
 * `EInk_Paper_Panel`, because a texture has to be assigned to exactly one mesh
 * and there is no way to infer which — and even that is looked up by its
 * `webRole` first, with the name only as a fallback.
 *
 * ---
 *
 * BLENDER IS Z-UP AND glTF IS Y-UP
 *
 * The exporter rotates the geometry on the way out but leaves custom properties
 * exactly as they were typed, because it has no way to know that three floats
 * called explodeX/Y/Z are a direction rather than, say, a colour. So the offsets
 * arrive in the OLD basis and have to be rotated by hand:
 *
 *   (x, y, z)_blender  ->  (x, z, -y)_gltf
 *
 * Getting this wrong is not subtle — parts fly sideways out of the frame
 * instead of lifting off the board — but it is invisible in the source, which is
 * why it gets a comment rather than a shrug.
 */

import * as THREE from 'three';
import { BOARD, GPIO_SPAN_MM, PANEL } from './device';

/* ------------------------------------------------------------------ *
 * Parts
 * ------------------------------------------------------------------ */

export type Part = {
  object: THREE.Object3D;
  /** 0 for the bare board, rising to `LAST_ORDER` for the display. */
  order: number;
  /** Where the part belongs, in the model's own space. */
  seated: THREE.Vector3;
  seatedQuaternion: THREE.Quaternion;
  seatedScale: THREE.Vector3;
  /** Displacement from `seated` to where the part starts, already Y-up. */
  offset: THREE.Vector3;
  /** The attitude it arrives in — a small tumble, so it does not slide in flat. */
  looseQuaternion: THREE.Quaternion;
};

/**
 * Collect the assembly roots.
 *
 * The tumble each part arrives with is derived from its own `assemblyOrder`
 * rather than randomised, and that is deliberate: a random attitude changes on
 * every reload, so a part that looked right once looks wrong the next time and
 * there is nothing to fix. Deriving it means the scene is identical on every
 * visit and any part that reads badly can be reasoned about.
 */
export function collectParts(root: THREE.Object3D): Part[] {
  const parts: Part[] = [];

  root.traverse((object) => {
    if (object.userData.webRole !== 'assembly_part') return;

    const order = Number(object.userData.assemblyOrder ?? 0);
    const seatedQuaternion = object.quaternion.clone();

    const tumble = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(
        ((order % 3) - 1) * 0.34,
        ((order % 5) - 2) * 0.22,
        ((order % 4) - 1.5) * 0.19,
      ),
    );

    parts.push({
      object,
      order,
      seated: object.position.clone(),
      seatedQuaternion,
      seatedScale: object.scale.clone(),
      // Blender Z-up -> glTF Y-up. See the note at the top of the file.
      offset: new THREE.Vector3(
        Number(object.userData.explodeX ?? 0),
        Number(object.userData.explodeZ ?? 0),
        -Number(object.userData.explodeY ?? 0),
      ),
      looseQuaternion: seatedQuaternion.clone().multiply(tumble),
    });
  });

  parts.sort((a, b) => a.order - b.order);
  return parts;
}

/** The mesh the panel image is painted onto. */
export function findPanelMesh(root: THREE.Object3D): THREE.Mesh | null {
  let found: THREE.Mesh | null = null;
  root.traverse((object) => {
    if (found || !(object instanceof THREE.Mesh)) return;
    if (object.userData.webRole === 'eink_texture_target') found = object;
  });
  if (found) return found;
  const named = root.getObjectByName('EInk_Paper_Panel');
  return named instanceof THREE.Mesh ? named : null;
}

/**
 * Put the panel image on the paper, not on Blender's box unwrap.
 *
 * The mesh is a 0.6 mm plate, so the exporter unwraps all six faces into one
 * atlas. The visible face only covers a strip of that atlas — which is why a
 * 296 × 128 composition showed up as a handful of giant pixels. Mapping U and
 * V from the plate's own width and depth puts the whole image on the paper,
 * and the edges (0.6 mm) pick up a sliver of the same image that nobody can
 * resolve.
 *
 * Clones the geometry so the GLTF cache stays untouched.
 */
export function projectPanelUVs(mesh: THREE.Mesh): void {
  const geometry = mesh.geometry.clone();
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box) return;

  const size = box.getSize(new THREE.Vector3());
  const pos = geometry.getAttribute('position');
  const uvs = new Float32Array(pos.count * 2);

  /*
    Image U (296 px, the name) follows local X (66.9 mm, the long edge).
    Image V (128 px) follows local Z (29.05 mm). Both axes are inverted so
    the ribbon sits at the bottom of the card, which is how the module is
    built.
  */
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    uvs[i * 2] = size.x === 0 ? 0 : 1 - (x - box.min.x) / size.x;
    uvs[i * 2 + 1] = size.z === 0 ? 0 : (z - box.min.z) / size.z;
  }

  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  mesh.geometry = geometry;
}

/* ------------------------------------------------------------------ *
 * Measurement
 * ------------------------------------------------------------------ */

export type Measured = {
  /** The PCB's own bounding box, in millimetres. */
  board: { width: number; height: number; thickness: number };
  /** Mean centre-to-centre spacing of one GPIO row, in millimetres. */
  gpioPitch: number;
  /** How many pins were actually found. */
  gpioPins: number;
  /** The panel's active area, in millimetres. */
  panel: { width: number; height: number };
  /** Total triangles across every mesh in the scene. */
  triangles: number;
  /** True when every measurement agrees with `device.ts` to within tolerance. */
  agrees: boolean;
};

const TOLERANCE_MM = 0.15;

/**
 * Measure the asset and check it against what `device.ts` claims.
 *
 * This is the site's whole method applied to a 3D model. A dimension quoted in
 * a caption is a claim; a dimension read off the vertex data is a measurement,
 * and the two being equal is the thing worth showing. If the model is ever
 * re-exported at centimetre scale — a genuinely common glTF accident — the
 * readout says so on screen rather than the page quietly asserting 85 mm about
 * an object that is now 850.
 *
 * MUST be called on the loaded scene before anything recentres or rescales it.
 * `Box3.setFromObject` walks world matrices, so measuring after the fit-to-view
 * scale has been applied returns the scaled size and every figure is wrong by
 * the same invisible factor.
 */
export function measureDevice(root: THREE.Object3D): Measured {
  root.updateMatrixWorld(true);

  const mm = (metres: number) => metres * 1000;
  const box = new THREE.Box3();
  const size = new THREE.Vector3();

  /* ---- the board ---- */
  const pcb = root.getObjectByName('PCB_RaspberryPi4_ModelB_85x56mm');
  const boardSize = new THREE.Vector3();
  if (pcb) {
    /*
      The PCB node has the whole board as its children — every trace, pad and
      silkscreen line — and some of those (the mounting-hole bores) stand proud
      of the laminate. Measuring the node with its children therefore measures
      the populated board, not the substrate. `setFromObject` with
      `precise = true` walks the actual vertices rather than the loose per-mesh
      bounding spheres, which is the difference between 85.0 and 85.6.
    */
    const laminate = pcb instanceof THREE.Mesh ? pcb : null;
    if (laminate) {
      laminate.geometry.computeBoundingBox();
      const local = laminate.geometry.boundingBox;
      if (local) {
        local.getSize(boardSize);
        boardSize.multiplyScalar(1000);
      }
    } else {
      box.setFromObject(pcb, true).getSize(size);
      boardSize.copy(size).multiplyScalar(1000);
    }
  }

  /* ---- the GPIO header ---- */
  /*
    One row only. The pins are numbered 01-20 along the near row and 21-40 along
    the far one, so measuring across all forty would measure the diagonal of the
    header and report a pitch about 0.3% too large — small enough to look
    plausible, which is exactly the kind of wrong this page exists not to be.
  */
  const pinXs: number[] = [];
  let pinCount = 0;
  root.traverse((object) => {
    const match = /^GPIO_Pin_(\d+)$/.exec(object.name);
    if (!match) return;
    pinCount += 1;
    const index = Number(match[1]);
    if (index >= 1 && index <= BOARD.gpioPins / 2) {
      pinXs.push(object.getWorldPosition(new THREE.Vector3()).x);
    }
  });
  pinXs.sort((a, b) => a - b);
  const gpioPitch =
    pinXs.length > 1
      ? mm(pinXs[pinXs.length - 1] - pinXs[0]) / (pinXs.length - 1)
      : 0;

  /* ---- the panel ---- */
  const panelMesh = findPanelMesh(root);
  const panelSize = new THREE.Vector3();
  if (panelMesh) {
    panelMesh.geometry.computeBoundingBox();
    const local = panelMesh.geometry.boundingBox;
    if (local) {
      local.getSize(panelSize);
      panelSize.multiplyScalar(1000);
    }
  }

  /* ---- triangles ---- */
  let triangles = 0;
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const geometry = object.geometry as THREE.BufferGeometry;
    const index = geometry.getIndex();
    const position = geometry.getAttribute('position');
    if (index) triangles += index.count / 3;
    else if (position) triangles += position.count / 3;
  });

  /*
    The panel mesh is a flat plate, so one of its three dimensions is its 0.6 mm
    thickness. Sorting and taking the two largest is how the active area is read
    without assuming which axis Blender happened to lay it out on.
  */
  const panelAxes = [panelSize.x, panelSize.y, panelSize.z].sort((a, b) => b - a);
  const boardAxes = [boardSize.x, boardSize.y, boardSize.z].sort((a, b) => b - a);

  const measured: Omit<Measured, 'agrees'> = {
    board: {
      width: boardAxes[0],
      height: boardAxes[1],
      thickness: boardAxes[2],
    },
    gpioPitch,
    gpioPins: pinCount,
    panel: { width: panelAxes[0], height: panelAxes[1] },
    triangles: Math.round(triangles),
  };

  const agrees =
    Math.abs(measured.board.width - BOARD.width) < TOLERANCE_MM &&
    Math.abs(measured.board.height - BOARD.height) < TOLERANCE_MM &&
    Math.abs(measured.board.thickness - BOARD.thickness) < TOLERANCE_MM &&
    Math.abs(measured.gpioPitch * (BOARD.gpioPins / 2 - 1) - GPIO_SPAN_MM) < TOLERANCE_MM &&
    measured.gpioPins === BOARD.gpioPins &&
    Math.abs(measured.panel.width - PANEL.activeWidth) < TOLERANCE_MM;

  return { ...measured, agrees };
}

/* ------------------------------------------------------------------ *
 * Materials
 * ------------------------------------------------------------------ */

/**
 * Read a colour out of the stylesheet.
 *
 * `CLAUDE.md` is explicit about this: there used to be a `lib/tokens.ts` mirror
 * of the palette for consumers that cannot read CSS, and it drifted — it still
 * claimed `#faf9f5` against a stylesheet that had said `#eceae4` for months.
 * Both halves were internally consistent, which is why nobody noticed. So the
 * board's green is READ from `--pcb-soldermask` at runtime rather than written
 * down a second time, and this 3D board is therefore exactly the green the
 * landing page's SVG board is. Two drawings of one device, one source for the
 * colour.
 */
function tokenColour(name: string, fallback: string): THREE.Color {
  if (typeof window === 'undefined') return new THREE.Color(fallback);
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return new THREE.Color(raw || fallback);
}

/**
 * Bring the exported materials up to something worth photographing.
 *
 * The GLB carries eighteen materials and NOT ONE TEXTURE — every surface is a
 * flat PBR factor. That sounds like a limitation and is mostly an opportunity:
 * there is nothing baked in to fight, so the whole look is decided here.
 *
 * Three things are done, in order of how much they matter:
 *
 * 1. `envMapIntensity`. A material at `metalness: 0.9` with no environment to
 *    reflect renders BLACK — it has no diffuse term by definition and nothing
 *    to mirror. Six of the eighteen materials here are metals (ENIG gold, the
 *    GPIO pins, copper, brushed aluminium), so without the studio environment
 *    from `studio.ts` most of the board is a silhouette. This is the single
 *    biggest difference between this render and the flat grey Blender preview.
 *
 * 2. The soldermask's colour, from the stylesheet, as above. The exported green
 *    is `rgb(0, 0.03, 0.01)` — very nearly black, which reads fine under
 *    Blender's studio lights and reads as a burnt board on warm paper.
 *
 * 3. Shadows. Every mesh casts and receives. A part arriving without a shadow
 *    does not look like it is above the board; it looks like it is stuck to the
 *    camera.
 */
export function dressMaterials(root: THREE.Object3D): void {
  const soldermask = tokenColour('--pcb-soldermask', '#14483a');
  const silkscreen = tokenColour('--pcb-silk', '#e8efe9');

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;

    object.castShadow = true;
    object.receiveShadow = true;

    const materials = Array.isArray(object.material) ? object.material : [object.material];
    object.material = materials.map((source) => {
      if (!(source instanceof THREE.MeshStandardMaterial)) return source;

      // Cloned, because glTF shares one material across every node that uses it
      // and mutating the shared instance would tint parts that are meant to
      // stay as they were.
      const material = source.clone();
      const name = source.name;

      material.envMapIntensity = 1;

      if (name === 'PCB_Green_Soldermask_Procedural') {
        material.color.copy(soldermask);
        // Real soldermask is a semi-gloss lacquer over a matte laminate, so it
        // takes a soft, wide highlight rather than a sharp one. The env
        // intensity stays under 1 or ACES plus the paper studio washes the
        // green out to mint.
        material.roughness = 0.46;
        material.envMapIntensity = 0.82;
      } else if (name === 'PCB_Silkscreen_Paint' || name === 'Silkscreen_White') {
        material.color.copy(silkscreen);
        material.roughness = 0.68;
      } else if (name === 'ENIG_Gold_Pads' || name === 'GPIO_Gold') {
        // ENIG is a flash of gold over nickel — warm, and never mirror-bright.
        material.envMapIntensity = 1.7;
        material.roughness = 0.28;
      } else if (name === 'Brushed_Aluminum') {
        material.envMapIntensity = 1.5;
      } else if (name === 'Copper_Procedural') {
        material.envMapIntensity = 1.4;
      } else if (name === 'EInk_Paper_Surface') {
        /*
          E-INK IS NOT A SCREEN AND MUST NOT BE LIT LIKE ONE.

          There is no backlight and no emission. The panel is pigment on a white
          background, read by whatever light is already in the room — which is
          why it is legible in sunlight and invisible in the dark, and why
          giving this material any emissive value at all would be drawing a
          device that does not exist. It is the roughest surface in the scene,
          because that is what a diffuse reflector is.
        */
        material.roughness = 0.95;
        material.metalness = 0;
        material.envMapIntensity = 1.05;
        material.emissive = new THREE.Color(0x000000);
      } else if (name === 'EInk_Matte_Bezel') {
        material.roughness = 0.82;
      }

      return material;
    });

    if (!Array.isArray(object.material) || object.material.length === 1) {
      object.material = Array.isArray(object.material) ? object.material[0] : object.material;
    }
  });
}
