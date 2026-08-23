/**
 * The GLB, turned into something the scroll story can drive.
 *
 * Three jobs, all of them done once when the asset lands and never per frame:
 * find the parts, put the panel image on the right face, and fix the materials.
 *
 * It also used to MEASURE the asset — reading the board's dimensions and the
 * GPIO pitch off the vertex data and checking them against the declared part —
 * which went out with the working column that printed the result. It is in git
 * (`git show ccb69d4 -- src/lib/founder/model.ts`) and belongs back here the
 * moment there is somewhere to show it.
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
import { fittingOrder } from './device';

/* ------------------------------------------------------------------ *
 * Parts
 * ------------------------------------------------------------------ */

export type Part = {
  object: THREE.Object3D;
  /**
   * The order this part is FITTED in — 0 for the bare board, rising to 18 for
   * the cable. Not always the `assemblyOrder` the export declared: see
   * `fittingOrder` in `device.ts` for the three that are remapped, and why.
   */
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
 * Parts the export seats slightly INSIDE the board, and how far to drop them.
 *
 * Two solids cannot occupy the same millimetre. The microSD slot is a
 * bottom-mount connector — on a real Pi 4 its body hangs under the laminate and
 * overhangs the edge, so that a card can be pushed in — and the model puts it
 * in the right place but a hair too high:
 *
 *   laminate   1.6 mm centred on y = 0.1050  ->  0.10420 .. 0.10580
 *   slot body  2.3 mm centred on y = 0.1040  ->  0.10285 .. 0.10515
 *
 * which is 0.95 mm of the slot buried in the board. Dropping it by exactly that
 * puts its top face flush against the underside:
 *
 *   0.10420 - 0.00115 = 0.10305,  and  0.10305 - 0.10400 = -0.00095
 *
 * It was invisible while the connector shells were dark and unmissable the
 * moment they were given a correct metal — a white slab through the board.
 * Metres, in the model's own space, before the fit-to-view scale.
 */
const SEATING_FIX: Readonly<Record<string, number>> = {
  MicroSD_Card_Slot: -0.00095,
};

/**
 * Collect the assembly roots.
 *
 * The tumble each part arrives with is derived from its own order rather than
 * randomised, and that is deliberate: a random attitude changes on every
 * reload, so a part that looked right once looks wrong the next time and there
 * is nothing to fix. Deriving it means the scene is identical on every visit
 * and any part that reads badly can be reasoned about.
 */
export function collectParts(root: THREE.Object3D): Part[] {
  const parts: Part[] = [];

  /*
    The laminate's own height, so a part can be asked which side of the board it
    belongs on. Read off the PCB node rather than written down, and compared in
    LOCAL space because every assembly root is a sibling of it — a world-space
    comparison here would also fold in the fit-to-view scale on the group above.
  */
  const board = root.getObjectByName('PCB_RaspberryPi4_ModelB_85x56mm');
  const boardY = board ? board.position.y : Number.NEGATIVE_INFINITY;

  root.traverse((object) => {
    if (object.userData.webRole !== 'assembly_part') return;

    // The order the part is FITTED in, which is not always the order the export
    // declared — a cable cannot be fitted before the two things it joins.
    const order = fittingOrder(Number(object.userData.assemblyOrder ?? 0));
    const seatedQuaternion = object.quaternion.clone();

    const seated = object.position.clone();
    const fix = SEATING_FIX[object.name];
    if (fix !== undefined) {
      seated.y += fix;
      // Applied to the object too, so the part is correct in the assembled
      // state even on the frames before `useFrame` has run.
      object.position.copy(seated);
    }

    const tumble = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(
        ((order % 3) - 1) * 0.34,
        ((order % 5) - 2) * 0.22,
        ((order % 4) - 1.5) * 0.19,
      ),
    );

    // Blender Z-up -> glTF Y-up. See the note at the top of the file.
    const offset = new THREE.Vector3(
      Number(object.userData.explodeX ?? 0),
      Number(object.userData.explodeZ ?? 0),
      -Number(object.userData.explodeY ?? 0),
    );

    /*
      ==================================================================
      A PART FITTED UNDER THE BOARD HAS TO ARRIVE FROM UNDER THE BOARD.
      ==================================================================

      Every `explodeZ` in the export is positive, so every part starts above its
      seat and descends onto it. That is right for the nineteen parts mounted on
      the top face and wrong for the one that is not.

      The microSD slot is a bottom-mount connector: its seat is BELOW the
      laminate. Starting it 69 mm up and moving it down means it travels
      straight through 1.6 mm of fibreglass on the way — two solids in the same
      place, for most of a second, in the middle of the frame.

      So the rule is derived from where the part is going rather than listed by
      name: if it seats below the board, it comes up from below. Re-export the
      model with a second underside part and it behaves correctly without this
      file changing.

      The travel is also shortened. There is nothing under the board to clear,
      and 69 mm of it would take the part below the surface the whole assembly
      is standing on.
    */
    if (seated.y < boardY && offset.y > 0) {
      offset.y = -offset.y * 0.45;
    }

    parts.push({
      object,
      order,
      seated,
      seatedQuaternion,
      seatedScale: object.scale.clone(),
      offset,
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
    Image U (296 px) follows local X, the plate's 66.9 mm long edge.
    Image V (128 px) follows local Z, its 29.05 mm short edge.

    NEITHER AXIS IS INVERTED, and that is worth stating because inverting U
    shipped once and is very easy to miss. A mirrored bitmap font is still a
    grid of crisp black squares — it looks like a working display until you
    actually read it, and then the ticker says AQVN and the clock says OTU
    14:E0. It was caught by screenshotting the page, not by reading this loop.

    The V direction depends on `flipY` being false on the texture, which is set
    where the texture is created: with flipY off, V = 0 is the canvas's FIRST
    row — the status strip — and it lands on the vertices with the smallest
    local z, which is the end of the module furthest from the ribbon. The
    ribbon therefore comes out of the bottom of the card, which is how the part
    is built.
  */
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    uvs[i * 2] = size.x === 0 ? 0 : (x - box.min.x) / size.x;
    uvs[i * 2 + 1] = size.z === 0 ? 0 : (z - box.min.z) / size.z;
  }

  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  mesh.geometry = geometry;
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
        /*
          THE EXPORT DESCRIBES A MATERIAL THAT CANNOT EXIST, and it is worth
          fixing rather than lighting around.

          It arrives as metalness 0.55 over an albedo of rgb(0.09, 0.10, 0.11).
          In the metallic-roughness model those two numbers fight each other: a
          surface is a conductor or it is not, and 0.55 is the half-way state
          that only ever appears at the boundary between two materials on one
          texture. Worse, a metal's base colour IS its specular reflectance, so
          an albedo of 0.09 describes a mirror that reflects nine per cent of
          what hits it — darker than soot.

          The result renders as flat light grey with no structure: not dark,
          because a bright environment still washes over it, and not metallic,
          because there is no F0 worth the name to carry a reflection. That is
          exactly how the connector shells read in the first screenshots — grey
          plastic blocks.

          Aluminium is a conductor, so: metalness 1, and the base colour is its
          reflectance rather than a pigment.

          THAT REFLECTANCE IS NOT 0.91 HERE, and getting it wrong in the other
          direction is just as visible. 0.91 is polished aluminium — a mirror —
          and setting it sent every connector shell to near-white against this
          page's paper studio: no tonal range, no highlight, no form. They read
          as white plastic slabs, which is worse than the flat grey they started
          as.

          These are not mirrors. A USB shell is drawn steel with a tin or nickel
          plate, and a brushed finish scatters most of what hits it. Around 0.6
          with a wider specular lobe leaves the top faces catching the key light
          and the sides falling into the darker part of the environment, which
          is the tonal separation that makes a metal look like metal.
        */
        material.color.setRGB(0.6, 0.62, 0.65, THREE.SRGBColorSpace);
        material.metalness = 1;
        material.roughness = 0.42;
        material.envMapIntensity = 0.8;
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
