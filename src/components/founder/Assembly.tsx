'use client';

/**
 * MODEL A, assembled.
 *
 * The landing page draws a companion board in SVG and calls it a specification.
 * This page builds the same device as an object: 200 nodes and 37,708 triangles
 * modelled in Blender, arriving part by part as the page is scrolled, ending
 * with the panel powering up and printing who built it.
 *
 * The relationship between the two pages is the point. One is a drawing of a
 * thing that does not exist yet; the other is the thing, photographed. They
 * share the device, the palette token for its soldermask, the bitmap font on
 * its display and the clock in its status strip — and they disagree about the
 * panel itself, because they are two different parts. See `device.ts`.
 *
 * There is no headline over it and no caption beside it. Both were here and
 * both came out: the type and the object were competing for the same screen,
 * and the object is the argument.
 *
 * ---
 *
 * WHY A GSAP PIN AND NOT CSS STICKY
 *
 * Sticky is the obvious answer — the outer element carries the scroll distance,
 * the inner one stays put while it passes, no library involved — and it does
 * not work in this codebase. `globals.css` sets `overflow-x: hidden` on `body`,
 * which makes `overflow-y` compute to `auto`, which makes `body` a scroll
 * container. A sticky element sticks within its nearest scrolling ancestor, so
 * the stage would be sticky relative to a box that never scrolls, and it simply
 * would not stick.
 *
 * That is a real trap and it cost a round of this build: the markup looks
 * correct, the CSS looks correct, and the failure is caused by a declaration
 * three thousand lines away in a different file. The landing page already had
 * the answer — a ScrollTrigger pin over the same track-and-stage pair, with
 * `pinSpacing: false` so the track's own height is the travel — and that is
 * what `CLAUDE.md` means when it says a pinned scroll story needs a track and a
 * stage.
 *
 * ---
 *
 * NOTHING HERE IS IN REACT STATE PER FRAME
 *
 * Scroll progress lives in a ref and is consumed inside `useFrame`. React is
 * told about exactly one thing after mount — that the reader has started
 * scrolling, so the cue can fade — and that fires once. Every other frame is a
 * pure function of one number and touches no state at all.
 */

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import { asset } from '@/lib/asset';
import { clamp, damp } from '@/lib/physics';
import { gsap, ScrollTrigger, prefersReducedMotion } from '@/lib/gsap';
import { useUi } from '@/lib/store';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { founderPage } from '@/content/founder';
import { founder } from '@/content/founder';
import { ACTS, PANEL, actForOrder, actRange } from '@/lib/founder/device';
import { ditherPortrait } from '@/lib/founder/portrait';
import type { Bitmap } from '@/lib/pixelfont';
import {
  collectParts,
  dressMaterials,
  findPanelMesh,
  projectPanelUVs,
} from '@/lib/founder/model';
import {
  buildEnvironment,
  captureAnchors,
  placeCamera,
  shotAt,
} from '@/lib/founder/studio';
import { composePanel, paintPanel, phaseAt, type PanelData } from '@/lib/founder/panel';
import styles from '@/components/founder/Founder.module.css';

const MODEL_URL = asset('/models/raspberry-pi-eink-assembly.glb');

/** How wide the assembled device is made, in scene units. */
const FIT_WIDTH = 2.3;

/*
  Where the face is in the portrait, as a fraction of each axis.

  The photograph is 3:4 and the panel is 2.3:1, so nearly two thirds of the
  image height has to be thrown away. Cropping to the centre of the frame would
  keep the middle of a tall portrait — a chest and a chin — so the crop is
  anchored on the head instead. Measured off the file rather than guessed: the
  eyes sit a little right of centre and about a third of the way down.
*/
const PORTRAIT_FOCUS = { x: 0.57, y: 0.37 };

/**
 * How far past a cover-crop to zoom in.
 *
 * A 3:4 photograph covering a 2.3:1 panel is decided by width alone, so at 1.0
 * the crop is the whole width of the picture — including all the empty ground
 * around the subject, which on a 296-pixel panel leaves a very small head. 1.5
 * fills the frame with the face.
 */
const PORTRAIT_ZOOM = 1.5;

/* ------------------------------------------------------------------ *
 * Choreography
 * ------------------------------------------------------------------ */

const smoothstep = (t: number): number => t * t * (3 - 2 * t);

/**
 * When a given part arrives, as a window in overall progress.
 *
 * Derived from the act table rather than authored per part, so the twelve
 * connectors of act three stagger themselves and a re-export with a thirteenth
 * needs no change here. Parts land across the first 70% of their act, which
 * leaves the last 30% as a beat of stillness before the camera moves on — the
 * thing that makes five acts read as five acts rather than as one long slide.
 */
const FINAL_ACT = ACTS.length - 1;

function seatWindow(order: number): { start: number; span: number } {
  const act = actForOrder(order);
  const { start: actStart, span: actSpan } = actRange(act);
  const siblings = ACTS[act].to - ACTS[act].from + 1;
  const i = order - ACTS[act].from;

  /*
    The final act is tighter than the others, because it has a second job: once
    its last part is fitted the panel still has to power on, and that has to
    happen with the assembly standing still. So its parts land in the first 45%
    of the act instead of the first 70%, and each one lands faster.
  */
  const final = act === FINAL_ACT;
  const spread = final ? 0.45 : 0.7;
  const width = final ? 0.14 : siblings === 1 ? 0.15 : 0.3;

  return {
    start: actStart + (i / siblings) * actSpan * spread,
    span: actSpan * width,
  };
}

/**
 * When the panel is allowed to power on: the moment the LAST part is fitted.
 *
 * Derived from the act table rather than typed in, so re-ordering the acts or
 * adding a part cannot leave the display flashing while something is still
 * visibly flying in.
 *
 * With the cable now fitted last (see `fittingOrder`), this is also the moment
 * the display is actually CONNECTED to anything — which is the only honest
 * moment for it to light up. Before it, the panel is unpowered and dark.
 */
const BOOT_START = (() => {
  const { start, span } = seatWindow(ACTS[FINAL_ACT].to);
  return start + span;
})();

/* ------------------------------------------------------------------ *
 * The device
 * ------------------------------------------------------------------ */

type DeviceProps = {
  track: React.RefObject<HTMLDivElement | null>;
  progress: React.MutableRefObject<number>;
  reduced: boolean;
  data: PanelData;
  now: React.MutableRefObject<number | null>;
  onCued: () => void;
  /** Fired once the model is built and the first frame can be drawn. */
  onReady: (ready: boolean) => void;
};

function Device({ track, progress, reduced, data, now, onCued, onReady }: DeviceProps) {
  const { scene: gltfScene } = useGLTF(MODEL_URL);
  const gl = useThree((state) => state.gl);
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);

  const group = useRef<THREE.Group>(null);
  const smoothed = useRef(0);
  /** Scroll speed, differenced from progress. Drives the inertial sway. */
  const speed = useRef(0);
  const sway = useRef(new THREE.Vector2());
  const panelKey = useRef('');
  const cuedRef = useRef(false);
  /** False until the first frame has placed the camera. See the note in useFrame. */
  const settled = useRef(false);
  /** The dithered photograph, once it has been prepared. */
  const portrait = useRef<Bitmap | null>(null);

  /* ---- the model, dressed and posed ---- */
  const model = useMemo(() => {
    const clone = gltfScene.clone(true);
    dressMaterials(clone);

    const box = new THREE.Box3().setFromObject(clone);
    const centre = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const scale = FIT_WIDTH / Math.max(size.x, size.z);

    clone.position.sub(centre);
    const holder = new THREE.Group();
    holder.add(clone);
    holder.scale.setScalar(scale);

    const parts = collectParts(clone);
    const panelMesh = findPanelMesh(clone);
    if (panelMesh) projectPanelUVs(panelMesh);

    /*
      THE ORDER OF THE NEXT THREE BLOCKS IS LOAD-BEARING.

      The GLB arrives fully assembled, and everything below reads from it in
      that state. Measure, anchor, THEN take it apart.
    */
    holder.updateMatrixWorld(true);

    // 1. The seated bounding box, in scene units, so the shadow catcher can sit
    //    on the underside of the board rather than at an arbitrary depth.
    const seatedBox = new THREE.Box3().setFromObject(holder);

    // 2. Where every shot's subject sits when it is fitted. Captured now,
    //    because in a moment none of these parts will be where they belong —
    //    and a camera that aims at a part's live position spends the whole page
    //    chasing it through the air. See `captureAnchors`.
    const anchors = captureAnchors(clone);

    // 3. Pose every part to its t = 0 exploded state, before the first frame is
    //    drawn. Without this the visitor sees the finished board for one frame
    //    and then watches it fly apart.
    for (const part of parts) {
      if (part.order === 0) continue;
      part.object.position.copy(part.seated).add(part.offset);
      part.object.quaternion.copy(part.looseQuaternion);
      part.object.scale.copy(part.seatedScale).multiplyScalar(0.0001);
      part.object.visible = false;
    }

    return { holder, clone, parts, panelMesh, anchors, floor: seatedBox.min.y };
  }, [gltfScene]);

  /*
    The scene is live. Announced from here rather than inferred from a progress
    number, because this component does not exist until Suspense has resolved
    the model — so reaching this line IS the definition of ready.
  */
  useEffect(() => {
    onReady(true);
  }, [onReady]);

  /*
    Prepare the photograph once, off the render path.

    Dithering is a serial pass over 37,888 pixels that cannot be vectorised —
    each pixel's decision depends on the error left by the one before it — so it
    is done once here and the result is reused for every frame that shows it.
    Doing it per repaint would be a visible hitch on the one act the page builds
    toward.
  */
  useEffect(() => {
    let cancelled = false;
    ditherPortrait(
      founder.portrait,
      PANEL.width,
      PANEL.height,
      PORTRAIT_FOCUS,
      PORTRAIT_ZOOM,
    )
      .then((bitmap) => {
        if (!cancelled) portrait.current = bitmap;
      })
      .catch(() => {
        /* The panel keeps the card. See `composePanel`. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---- the studio environment ---- */
  useEffect(() => {
    const environment = buildEnvironment(gl);
    scene.environment = environment;
    return () => {
      scene.environment = null;
      environment.dispose();
    };
  }, [gl, scene]);

  /* ---- the panel's texture ---- */
  const panel = useMemo(() => {
    const canvas = document.createElement('canvas');
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    // glTF UVs have their origin at the top left; a canvas texture defaults to
    // the OpenGL convention and arrives upside down without this.
    texture.flipY = false;
    texture.anisotropy = gl.capabilities.getMaxAnisotropy();
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    return { canvas, texture };
  }, [gl]);

  useEffect(() => {
    const mesh = model.panelMesh;
    if (!mesh) return;
    const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    if (!(material instanceof THREE.MeshStandardMaterial)) return;
    material.map = panel.texture;
    // The exported base colour is a grey; leaving it in place would multiply the
    // panel image down to the same grey and lose most of the contrast.
    material.color.set(0xffffff);
    /*
      Painted blank immediately, so the very first frame shows an unpowered
      panel rather than whatever the canvas element happened to contain — which
      is transparent black, and reads as a hole cut in the module.
    */
    const blank = { kind: 'blank' } as const;
    paintPanel(panel.canvas, composePanel(blank, data), blank);
    panel.texture.needsUpdate = true;
    material.needsUpdate = true;
    return () => {
      material.map = null;
      material.needsUpdate = true;
    };
    // `data` is deliberately not a dependency: the blank frame does not read it,
    // and re-running this on every clock tick would rebind the material sixty
    // times an hour for no change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model.panelMesh, panel]);

  useEffect(() => () => {
    panel.texture.dispose();
  }, [panel]);

  /* ---- scratch vectors, allocated once ---- */
  const scratch = useMemo(
    () => ({
      position: new THREE.Vector3(),
      target: new THREE.Vector3(),
      look: new THREE.Vector3(),
      centre: new THREE.Vector3(),
      quaternion: new THREE.Quaternion(),
    }),
    [],
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20);

    /* ---- where in the story are we ---- */
    let raw = 1;
    if (!reduced) {
      const element = track.current;
      if (element) {
        const rect = element.getBoundingClientRect();
        const travel = Math.max(rect.height - window.innerHeight, 1);
        raw = clamp(-rect.top / travel, 0, 1);
      }
    }
    progress.current = raw;
    if (raw > 0.02 && !cuedRef.current) {
      cuedRef.current = true;
      onCued();
    }

    /*
      THE FIRST FRAME IS SNAPPED, NOT EASED.

      Everything here — the progress, the camera position, the point it is
      looking at — is a damped value chasing a target, and every one of them
      starts at zero. On the first frame after the model lands, that means the
      camera is at the origin looking at the origin while its target is several
      units away, so the board swings in from a corner of the frame and settles.
      It reads as the page breaking, and it is the first thing a visitor sees.

      This component does not mount until the GLB has loaded (it is inside a
      Suspense boundary), so the first frame it ever runs is the right moment to
      place everything exactly where it belongs and start easing from there.
    */
    const first = !settled.current;
    const previous = smoothed.current;
    // Frame-rate independent, so the story runs at the same pace on a 60Hz
    // laptop and a 120Hz phone. A fixed per-frame lerp would not.
    smoothed.current = reduced || first ? raw : damp(previous, raw, 0.055, dt);
    const t = smoothed.current;

    /* ---- parts ---- */
    for (const part of model.parts) {
      const { start, span } = seatWindow(part.order);
      const seated = part.order === 0 ? 1 : smoothstep(clamp((t - start) / span, 0, 1));

      part.object.position
        .copy(part.seated)
        .addScaledVector(part.offset, 1 - seated);
      part.object.quaternion.slerpQuaternions(
        part.looseQuaternion,
        part.seatedQuaternion,
        seated,
      );
      /*
        Scaled from nothing rather than faded in. A part cannot be
        semi-transparent — it is aluminium — and cross-fading opacity on a
        shadow-casting mesh leaves the shadow at full strength while the part is
        invisible, which reads as a hole in the board.
      */
      part.object.scale
        .copy(part.seatedScale)
        .multiplyScalar(part.order === 0 ? 1 : Math.max(0.0001, seated));
      part.object.visible = seated > 0.001;
    }

    /* ---- the panel ---- */
    if (model.panelMesh) {
      const boot = clamp((t - BOOT_START) / (1 - BOOT_START), 0, 1);
      const phase = phaseAt(boot);
      /*
        Repainted only when what it shows CHANGES. The key folds in the minute
        so the clock ticks, and nothing else — a repaint is 600,000 pixels of
        ImageData and doing it per frame would cost more than the entire rest of
        the scene.
      */
      const at = now.current;
      const minute = at === null ? 'x' : Math.floor(at / 60000);
      // The portrait's arrival is part of the key: without it, a photograph
      // that finishes dithering while the panel is already showing the portrait
      // phase would never be painted, and the card would sit there instead.
      const key = `${phase.kind}:${minute}:${portrait.current ? 1 : 0}`;
      if (key !== panelKey.current) {
        panelKey.current = key;
        paintPanel(
          panel.canvas,
          composePanel(phase, { ...data, at }, portrait.current),
          phase,
        );
        panel.texture.needsUpdate = true;
      }
    }

    /* ---- camera ---- */
    const frame = shotAt(t);
    model.holder.getWorldPosition(scratch.centre);
    placeCamera(frame, model.anchors, scratch.centre, scratch.position, scratch.target);

    if (reduced || first) {
      camera.position.copy(scratch.position);
      scratch.look.copy(scratch.target);
      settled.current = true;
    } else {
      // The camera is damped as well as the progress that drives it. Two stages
      // of smoothing is what turns a scrubbed move into something that reads as
      // a camera operator rather than as a slider.
      camera.position.x = damp(camera.position.x, scratch.position.x, 0.075, dt);
      camera.position.y = damp(camera.position.y, scratch.position.y, 0.075, dt);
      camera.position.z = damp(camera.position.z, scratch.position.z, 0.075, dt);
      scratch.look.set(
        damp(scratch.look.x, scratch.target.x, 0.075, dt),
        damp(scratch.look.y, scratch.target.y, 0.075, dt),
        damp(scratch.look.z, scratch.target.z, 0.075, dt),
      );
    }
    camera.lookAt(scratch.look);

    /* ---- inertial sway ---- */
    /*
      The assembly leans against the direction of scroll, like something held in
      the hand rather than bolted to the page. Driven by the DIFFERENCE in
      progress — a velocity — rather than by progress itself, so it returns to
      rest whenever the reader stops, and carries a little momentum when they
      stop suddenly. Mapping rotation to scroll POSITION instead would be
      reversible and dead.

      Kept small on purpose. At the amplitude this first shipped (five degrees)
      it was a third motion on top of a camera that is already travelling and a
      subject that is already assembling, and the three together read as the
      board being shaken rather than as weight. Two degrees is felt without
      being seen, which is the whole job.
    */
    if (!reduced && group.current) {
      const velocity = (smoothed.current - previous) / Math.max(dt, 1e-4);
      speed.current = damp(speed.current, velocity, 0.09, dt);
      const lean = clamp(speed.current * 0.16, -0.035, 0.035);
      sway.current.x = damp(sway.current.x, lean, 0.13, dt);
      sway.current.y = damp(sway.current.y, lean * 0.6, 0.16, dt);
      group.current.rotation.x = sway.current.x;
      group.current.rotation.z = sway.current.y;
    }
  });

  return (
    <group ref={group}>
      <primitive object={model.holder} />
      {/*
        The shadow catcher.

        A plane that is invisible except where something shadows it, sitting on
        the underside of the seated board. Without it the device floats in a
        void: a shadow is the only cue that says an object is ON something, and
        parts arriving from above are half of this page.
      */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, model.floor - 0.002, 0]}
        receiveShadow
      >
        <planeGeometry args={[14, 14]} />
        <shadowMaterial transparent opacity={0.17} color="#2b2f36" />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ *
 * Loading
 * ------------------------------------------------------------------ */

/**
 * The wait, filled by the thing being waited for.
 *
 * The model is 2.1 MB — the only asset on this site big enough to be worth a
 * loader at all — and until it lands there is nothing on screen. So the numeral
 * fills as it downloads: `useProgress` reads three.js's own loading manager, so
 * the fill is the actual number of bytes in, not a timer chosen to look about
 * right. `Preloader.tsx` makes the same point about the site's own boot screen,
 * and a bar that finishes before the page does is the most common lie in this
 * pattern.
 *
 * It is dismissed on `ready` — a signal from the scene itself — rather than on
 * the progress reaching 100. A cached model can be served without the manager
 * ever reporting a byte, and a loader that waits for a number that will never
 * arrive is worse than no loader.
 */
function Loading({ ready }: { ready: boolean }) {
  const { progress } = useProgress();
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (!ready) return;
    // Outlast the fade so the panel is not torn out from under its own
    // transition; matches the 420ms in `.loading[data-done]`.
    const id = window.setTimeout(() => setGone(true), 460);
    return () => window.clearTimeout(id);
  }, [ready]);

  if (gone) return null;

  const shown = ready ? 100 : progress;

  return (
    <div
      className={styles.loading}
      data-done={ready ? '' : undefined}
      role="status"
      aria-label="Loading the model"
    >
      {/*
        The wordmark's own numeral, filled from the bottom as the bytes arrive.
        `background-clip: text` over a hard-stopped gradient, so the fill has an
        edge rather than a glow — the same register as the rail on the site's
        loader.
      */}
      <span
        className={styles.loadingMark}
        style={{ '--fill': `${shown}%` } as React.CSSProperties}
        aria-hidden="true"
      >
        17
      </span>
      <span className={`mono-label ${styles.loadingCount}`}>
        {String(Math.round(shown)).padStart(3, '0')}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * The section
 * ------------------------------------------------------------------ */

type AssemblyProps = { data: PanelData };

export function Assembly({ data }: AssemblyProps) {
  const track = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const now = useRef<number | null>(null);
  const [reduced, setReduced] = useState(false);
  const [live, setLive] = useState(true);
  const [supported, setSupported] = useState(true);
  const [cued, setCued] = useState(false);
  const [ready, setReady] = useState(false);
  const entered = useUi((state) => state.entered);

  useIsomorphicLayoutEffect(() => {
    setReduced(prefersReducedMotion());

    /*
      WebGL is checked rather than assumed. A machine without it — or with it
      blocklisted, which is common on older integrated drivers — would otherwise
      get a Canvas that throws during its first render and takes the route's
      whole subtree with it. Studio rule 4: content is never behind a script
      that might not run.
    */
    try {
      const probe = document.createElement('canvas');
      setSupported(Boolean(probe.getContext('webgl2') ?? probe.getContext('webgl')));
    } catch {
      setSupported(false);
    }
  }, []);

  /*
    CSS sticky fails here: `body` carries `overflow-x: hidden`, which makes
    the stage a descendant of a scroll container and sticky stops sticking.
    The landing already solved this with a ScrollTrigger pin — same track and
    stage, `pinSpacing: false` so the track's own height is the travel.
  */
  useIsomorphicLayoutEffect(() => {
    const el = track.current;
    const stageEl = el?.querySelector(`.${styles.stage}`);
    if (!el || !stageEl || reduced || !supported) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top top',
        end: 'bottom bottom',
        pin: stageEl,
        pinSpacing: false,
      });
    }, el);

    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, [reduced, supported]);

  /*
    The clock starts on the client and nowhere else. Putting `Date.now()` in
    the render path would stamp a build-time instant into the static export,
    and the panel would show whatever minute the deploy ran at.
  */
  useEffect(() => {
    now.current = Date.now();
    const id = window.setInterval(() => {
      now.current = Date.now();
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  /*
    Rendering stops when the section leaves the viewport. The record below it is
    long, and a WebGL loop running against nothing while someone reads it is
    pure heat.
  */
  useEffect(() => {
    const element = track.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setLive(entry.isIntersecting),
      { rootMargin: '120px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  /*
    No WebGL: the section collapses to nothing and the employment record below
    it carries the page on its own. Rendering an empty pinned 600vh track would
    be six screens of blank paper to scroll past.
  */
  if (!supported) return null;

  return (
    <section
      className={styles.track}
      ref={track}
      data-static={reduced ? 'true' : undefined}
      aria-label="A Raspberry Pi and e-ink display assembling themselves as the page is scrolled"
    >
      <div className={styles.stage}>
        <div className={styles.canvas}>
          <Canvas
            frameloop={live && entered ? 'always' : 'never'}
            dpr={[1, 2]}
            shadows
            camera={{ fov: 32, near: 0.05, far: 60, position: [1.4, 1.9, 2.6] }}
            gl={{
              antialias: true,
              alpha: true,
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 0.92,
            }}
          >
            {/*
              One key light, and nothing else. Everything that is not a hard
              shadow comes from the studio environment in `studio.ts` — which is
              how a real product shot is lit, and the reason the metals read as
              metal. Piling on point lights to compensate for a missing
              environment is the usual mistake and it produces the flat, waxy
              look this render is trying not to have.
            */}
            <directionalLight
              position={[-3.2, 4.4, 2.4]}
              intensity={1.55}
              castShadow
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
              shadow-camera-near={0.5}
              shadow-camera-far={14}
              shadow-camera-left={-2.6}
              shadow-camera-right={2.6}
              shadow-camera-top={2.6}
              shadow-camera-bottom={-2.6}
              shadow-bias={-0.0006}
              shadow-normalBias={0.012}
            />
            <Suspense fallback={null}>
              <Device
                track={track}
                progress={progress}
                reduced={reduced}
                data={data}
                now={now}
                onCued={() => setCued(true)}
                onReady={setReady}
              />
            </Suspense>
          </Canvas>
        </div>

        <Loading ready={ready} />

        {!reduced && (
          <div className={styles.cue} data-gone={cued ? '' : undefined} aria-hidden="true">
            <span className={`mono-label ${styles.cueLabel}`}>{founderPage.cue}</span>
            <span className={styles.cueRail}>
              <span className={styles.cueTravel} />
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

if (typeof window !== 'undefined') {
  useGLTF.preload(MODEL_URL);
}
