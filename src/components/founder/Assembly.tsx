'use client';

/**
 * MODEL A, assembled.
 *
 * The landing page draws a companion board in SVG and calls it a specification.
 * This page builds the same device as an object: 200 nodes and 37,708 triangles
 * modelled in Blender, arriving part by part as the page is scrolled, ending
 * with the panel running its real power-on waveform.
 *
 * The relationship between the two pages is the point. One is a drawing of a
 * thing that does not exist yet; the other is the thing, photographed. They
 * share the device, the palette token for its soldermask, the bitmap font on
 * its display and the firmware behind the readout — and they disagree about the
 * panel, for a reason that is stated on screen.
 *
 * ---
 *
 * WHY STICKY AND NOT A GSAP PIN
 *
 * `CLAUDE.md` requires a track and a stage for any pinned story, and CSS
 * `position: sticky` IS a track and a stage — the outer element carries the
 * scroll distance, the inner one stays put while it passes. The landing page
 * uses ScrollTrigger's pin because it also needs a scrubbed timeline; nothing
 * here is on a timeline. Every frame is a pure function of one number, and that
 * number is read straight off the track's `getBoundingClientRect()` inside the
 * render loop.
 *
 * That removes an entire class of problem rather than solving it: no
 * `ScrollTrigger.refresh()` after a layout change, no pin-spacing arithmetic, no
 * ordering dependency on Lenis, and nothing to revert on unmount. Lenis scrolls
 * the window, so the rect is already correct.
 *
 * ---
 *
 * NOTHING HERE IS IN REACT STATE PER FRAME
 *
 * Scroll progress lives in a ref and is consumed inside `useFrame`. React sees
 * exactly two things: which of the five acts is current (five transitions over
 * the whole page) and the measurements taken once when the asset lands. A
 * `setState` per frame would re-render the readout sixty times a second to
 * change nothing.
 */

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { asset } from '@/lib/asset';
import { clamp, damp } from '@/lib/physics';
import { gsap, ScrollTrigger, prefersReducedMotion } from '@/lib/gsap';
import { useUi } from '@/lib/store';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { founderPage } from '@/content/founder';
import { ACTS, actForOrder } from '@/lib/founder/device';
import {
  collectParts,
  dressMaterials,
  findPanelMesh,
  measureDevice,
  projectPanelUVs,
  type Measured,
} from '@/lib/founder/model';
import { buildEnvironment, placeCamera, shotAt } from '@/lib/founder/studio';
import { composePanel, paintPanel, phaseAt, type PanelData } from '@/lib/founder/panel';
import { Readout } from '@/components/founder/Readout';
import styles from '@/components/founder/Founder.module.css';

const MODEL_URL = asset('/models/raspberry-pi-eink-assembly.glb');

/** How wide the assembled device is made, in scene units. */
const FIT_WIDTH = 2.3;

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
function seatWindow(order: number): { start: number; span: number } {
  const act = actForOrder(order);
  const actStart = act / ACTS.length;
  const actSpan = 1 / ACTS.length;
  const siblings = ACTS[act].to - ACTS[act].from + 1;
  const i = order - ACTS[act].from;

  return {
    start: actStart + (i / siblings) * actSpan * 0.7,
    /*
      A lone part seats fast. Act five has exactly one — the display — and the
      power-on waveform starts at 16% into the act, so a part still drifting in
      at 30% would be flashing black while it was visibly still landing.
    */
    span: actSpan * (siblings === 1 ? 0.15 : 0.3),
  };
}

/* ------------------------------------------------------------------ *
 * The device
 * ------------------------------------------------------------------ */

type DeviceProps = {
  track: React.RefObject<HTMLDivElement | null>;
  progress: React.MutableRefObject<number>;
  reduced: boolean;
  data: PanelData;
  now: React.MutableRefObject<number | null>;
  onMeasured: (m: Measured) => void;
  onAct: (act: number) => void;
  onCued: () => void;
};

function Device({
  track,
  progress,
  reduced,
  data,
  now,
  onMeasured,
  onAct,
  onCued,
}: DeviceProps) {
  const { scene: gltfScene } = useGLTF(MODEL_URL);
  const gl = useThree((state) => state.gl);
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);

  const group = useRef<THREE.Group>(null);
  const smoothed = useRef(0);
  const actRef = useRef(-1);
  /** Scroll speed, differenced from progress. Drives the inertial sway. */
  const speed = useRef(0);
  const sway = useRef(new THREE.Vector2());
  const panelKey = useRef('');
  const cuedRef = useRef(false);

  /* ---- the model, measured then dressed ---- */
  const model = useMemo(() => {
    /*
      MEASURED FIRST, on the untouched scene.

      `Box3.setFromObject` walks world matrices, so measuring after the
      fit-to-view scale below would return 2.3-units-worth of millimetres and
      every figure in the readout would be wrong by the same invisible factor.
      The order of these two blocks is load-bearing.
    */
    const measured = measureDevice(gltfScene);

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
      Pose every part at t = 0 before the first frame. useFrame does not run
      until the preloader has handed over (`frameloop` is `never` until then),
      and the GLB arrives fully assembled — so without this the visitor would
      see the finished board for a frame, then watch it explode.
    */
    for (const part of parts) {
      if (part.order === 0) continue;
      part.object.position.copy(part.seated).add(part.offset);
      part.object.quaternion.copy(part.looseQuaternion);
      part.object.scale.copy(part.seatedScale).multiplyScalar(0.0001);
      part.object.visible = false;
    }

    // The seated bounding box, in scene units, so the shadow catcher can sit on
    // the underside of the board rather than at an arbitrary depth.
    holder.updateMatrixWorld(true);
    const seatedBox = new THREE.Box3().setFromObject(holder);

    return { holder, clone, parts, panelMesh, measured, floor: seatedBox.min.y };
  }, [gltfScene]);

  useEffect(() => {
    onMeasured(model.measured);
  }, [model.measured, onMeasured]);

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
    paintPanel(panel.canvas, composePanel({ kind: 'blank' }, data));
    panel.texture.needsUpdate = true;
    material.needsUpdate = true;
    return () => {
      material.map = null;
      material.needsUpdate = true;
    };
  }, [model.panelMesh, panel.texture, data]);

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

    const previous = smoothed.current;
    // Frame-rate independent, so the story runs at the same pace on a 60Hz
    // laptop and a 120Hz phone. A fixed per-frame lerp would not.
    smoothed.current = reduced ? raw : damp(previous, raw, 0.055, dt);
    const t = smoothed.current;

    /* ---- act ---- */
    const act = Math.min(ACTS.length - 1, Math.floor(t * ACTS.length));
    if (act !== actRef.current) {
      actRef.current = act;
      onAct(act);
    }

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
      const boot = clamp((t - (ACTS.length - 1) / ACTS.length) * ACTS.length, 0, 1);
      const phase = phaseAt(boot);
      /*
        Repainted only when what it shows CHANGES. The key folds in the minute
        so the clock ticks, and nothing else — a repaint is 600,000 pixels of
        ImageData and doing it per frame would cost more than the entire rest of
        the scene.
      */
      const at = now.current;
      const live = { ...data, at };
      const minute = at === null ? 'x' : Math.floor(at / 60000);
      const key = `${phase.kind}:${'ink' in phase ? phase.ink : ''}:${minute}`;
      if (key !== panelKey.current) {
        panelKey.current = key;
        const ghost =
          phase.kind === 'readout' ? composePanel({ kind: 'card' }, live) : null;
        paintPanel(panel.canvas, composePanel(phase, live), { ghost });
        panel.texture.needsUpdate = true;
      }
    }

    /* ---- camera ---- */
    const shot = shotAt(t);
    model.holder.getWorldPosition(scratch.centre);
    placeCamera(shot, model.clone, scratch.centre, scratch.position, scratch.target);

    if (reduced) {
      camera.position.copy(scratch.position);
      scratch.look.copy(scratch.target);
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
    */
    if (!reduced && group.current) {
      const velocity = (smoothed.current - previous) / Math.max(dt, 1e-4);
      speed.current = damp(speed.current, velocity, 0.09, dt);
      const lean = clamp(speed.current * 0.35, -0.09, 0.09);
      sway.current.x = damp(sway.current.x, lean, 0.11, dt);
      sway.current.y = damp(sway.current.y, lean * 0.6, 0.14, dt);
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
 * The section
 * ------------------------------------------------------------------ */

type AssemblyProps = { data: PanelData };

export function Assembly({ data }: AssemblyProps) {
  const track = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const now = useRef<number | null>(null);
  const [act, setAct] = useState(0);
  const [measured, setMeasured] = useState<Measured | null>(null);
  const [reduced, setReduced] = useState(false);
  const [live, setLive] = useState(true);
  const [supported, setSupported] = useState(true);
  const [cued, setCued] = useState(false);
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

  if (!supported) {
    return (
      <section className={styles.fallback}>
        <h1 className={styles.identityName}>{founderPage.wordmarkTop} {founderPage.wordmarkBottom}</h1>
        <p className={styles.line}>{founderPage.line}</p>
        <Readout act={4} measured={null} reduced />
      </section>
    );
  }

  return (
    <section
      className={styles.track}
      ref={track}
      data-static={reduced ? 'true' : undefined}
      aria-label="A Raspberry Pi and e-ink display assembling themselves as the page is scrolled"
    >
      <div className={styles.stage}>
        <h1 className={`${styles.wordmark} ${styles.wordmarkTop}`}>
          {founderPage.wordmarkTop}
        </h1>
        <h2 className={`${styles.wordmark} ${styles.wordmarkBottom}`}>
          {founderPage.wordmarkBottom}
        </h2>
        <p className={`mono-label ${styles.eyebrow}`}>{founderPage.eyebrow}</p>
        <p className={styles.line}>{founderPage.line}</p>

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
                onMeasured={setMeasured}
                onAct={setAct}
                onCued={() => setCued(true)}
              />
            </Suspense>
          </Canvas>
        </div>

        {!reduced && (
          <div className={styles.cue} data-gone={cued ? '' : undefined} aria-hidden="true">
            <span className={`mono-label ${styles.cueLabel}`}>{founderPage.cue}</span>
            <span className={styles.cueRail}>
              <span className={styles.cueTravel} />
            </span>
          </div>
        )}

        <Readout act={act} measured={measured} reduced={reduced} />
      </div>
    </section>
  );
}

if (typeof window !== 'undefined') {
  useGLTF.preload(MODEL_URL);
}
