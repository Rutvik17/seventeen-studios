'use client';

/**
 * MODEL A, assembled.
 *
 * You are sitting at a bench. The board is on the table in front of you.
 * You walk up, you sit, parts land, the cable comes in from the left, the
 * glass arrives, you lean toward it. The camera is a head, not a drone —
 * azimuth never changes, and the look-at never jumps onto a part.
 */

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import { asset } from '@/lib/asset';
import { clamp, damp } from '@/lib/physics';
import { gsap, ScrollTrigger, prefersReducedMotion } from '@/lib/gsap';
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
import { assemblerAt, buildEnvironment, placeAssembler } from '@/lib/founder/studio';
import { composePanel, paintPanel } from '@/lib/founder/panel';
import { Readout } from '@/components/founder/Readout';
import styles from '@/components/founder/Founder.module.css';

const MODEL_URL = asset('/models/raspberry-pi-eink-assembly.glb');
const FIT_WIDTH = 2.3;

/** Assembly does not start until you have sat down at the table. */
const BUILD_START = 0.24;
const BUILD_END = 0.9;

const smoothstep = (t: number): number => t * t * (3 - 2 * t);

function seatWindow(order: number): { start: number; span: number } {
  const act = actForOrder(order);
  const spanAll = BUILD_END - BUILD_START;
  const actStart = BUILD_START + (act / ACTS.length) * spanAll;
  const actSpan = spanAll / ACTS.length;
  const siblings = ACTS[act].to - ACTS[act].from + 1;
  const i = order - ACTS[act].from;
  return {
    start: actStart + (i / siblings) * actSpan * 0.7,
    span: actSpan * (siblings === 1 ? 0.18 : 0.28),
  };
}

type DeviceProps = {
  track: React.RefObject<HTMLDivElement | null>;
  progress: React.MutableRefObject<number>;
  reduced: boolean;
  onMeasured: (m: Measured) => void;
  onAct: (act: number) => void;
  onCued: () => void;
  onReady: () => void;
};

function Device({
  track,
  progress,
  reduced,
  onMeasured,
  onAct,
  onCued,
  onReady,
}: DeviceProps) {
  const { scene: gltfScene } = useGLTF(MODEL_URL);
  const gl = useThree((state) => state.gl);
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);

  const group = useRef<THREE.Group>(null);
  const smoothed = useRef(reduced ? 1 : 0);
  const actRef = useRef(-1);
  const cuedRef = useRef(false);
  const readyRef = useRef(false);
  const look = useRef(new THREE.Vector3());
  const panelWorld = useRef(new THREE.Vector3());

  const model = useMemo(() => {
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
    /*
      The export faces the HDMI/power edge toward +Z. From the chair that is
      upside down. 165° — a touch short of a half-turn — so the board is
      readable but not squared to the table edge.
    */
    holder.rotation.y = (165 * Math.PI) / 180;

    const parts = collectParts(clone);
    const panelMesh = findPanelMesh(clone);
    if (panelMesh) projectPanelUVs(panelMesh);

    for (const part of parts) {
      if (part.order === 0) continue;
      part.object.position.copy(part.seated).add(part.offset);
      part.object.quaternion.copy(part.seatedQuaternion);
      part.object.visible = false;
    }

    holder.updateMatrixWorld(true);
    const seatedBox = new THREE.Box3().setFromObject(holder);
    const origin = new THREE.Vector3();
    holder.getWorldPosition(origin);

    return {
      holder,
      clone,
      parts,
      panelMesh,
      measured,
      floor: seatedBox.min.y,
      origin,
    };
  }, [gltfScene]);

  useEffect(() => {
    onMeasured(model.measured);
  }, [model.measured, onMeasured]);

  useEffect(() => {
    const environment = buildEnvironment(gl);
    scene.environment = environment;
    return () => {
      scene.environment = null;
      environment.dispose();
    };
  }, [gl, scene]);

  const panel = useMemo(() => {
    const canvas = document.createElement('canvas');
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
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
    material.color.set(0xffffff);
    paintPanel(panel.canvas, composePanel({ kind: 'blank' }));
    panel.texture.needsUpdate = true;
    material.needsUpdate = true;
    return () => {
      material.map = null;
      material.needsUpdate = true;
    };
  }, [model.panelMesh, panel.texture]);

  useEffect(() => () => {
    panel.texture.dispose();
  }, [panel]);

  const scratch = useMemo(
    () => ({
      position: new THREE.Vector3(),
      target: new THREE.Vector3(),
      centre: new THREE.Vector3(),
    }),
    [],
  );

  useLayoutEffect(() => {
    const pose = assemblerAt(reduced ? 1 : 0);
    const panel = model.panelMesh
      ? (model.panelMesh.getWorldPosition(panelWorld.current), panelWorld.current)
      : null;
    placeAssembler(pose, model.origin, panel, camera.position, look.current);
    camera.lookAt(look.current);
    if (!readyRef.current) {
      readyRef.current = true;
      onReady();
    }
  }, [camera, model, reduced]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20);

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

    smoothed.current = reduced ? raw : damp(smoothed.current, raw, 0.08, dt);
    const t = smoothed.current;

    const act = Math.min(ACTS.length - 1, Math.floor(t * ACTS.length));
    if (act !== actRef.current) {
      actRef.current = act;
      onAct(act);
    }

    for (const part of model.parts) {
      if (part.order === 0) {
        part.object.visible = true;
        continue;
      }
      const { start, span } = seatWindow(part.order);
      const seated = smoothstep(clamp((t - start) / span, 0, 1));
      part.object.position.copy(part.seated).addScaledVector(part.offset, 1 - seated);
      part.object.quaternion.copy(part.seatedQuaternion);
      part.object.visible = seated > 0.001;
    }

    const pose = assemblerAt(t);
    if (model.panelMesh) model.panelMesh.getWorldPosition(panelWorld.current);
    model.holder.getWorldPosition(scratch.centre);
    placeAssembler(
      pose,
      scratch.centre,
      model.panelMesh ? panelWorld.current : null,
      scratch.position,
      scratch.target,
    );

    if (reduced) {
      camera.position.copy(scratch.position);
      look.current.copy(scratch.target);
    } else {
      camera.position.x = damp(camera.position.x, scratch.position.x, 0.11, dt);
      camera.position.y = damp(camera.position.y, scratch.position.y, 0.11, dt);
      camera.position.z = damp(camera.position.z, scratch.position.z, 0.11, dt);
      look.current.x = damp(look.current.x, scratch.target.x, 0.11, dt);
      look.current.y = damp(look.current.y, scratch.target.y, 0.11, dt);
      look.current.z = damp(look.current.z, scratch.target.z, 0.11, dt);
    }
    camera.lookAt(look.current);
  });

  return (
    <group ref={group}>
      <primitive object={model.holder} />
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

function Boot({ done }: { done: boolean }) {
  const { progress, loaded, total } = useProgress();
  const pct = Math.round(progress);
  const line =
    pct < 35 ? 'Fetching the board' : pct < 75 ? 'Unpacking the parts' : 'Setting the table';

  return (
    <div className={styles.boot} data-done={done ? '' : undefined} aria-live="polite">
      <span className="mono-label">Model A</span>
      <p>{line}</p>
      <div className={styles.bootRail}>
        <i style={{ transform: `scaleX(${Math.max(0.02, pct / 100)})` }} />
      </div>
      <span className="mono-label">
        {String(pct).padStart(3, '0')}
        {total ? ` · ${loaded}/${total}` : ''}
      </span>
    </div>
  );
}

export function Assembly() {
  const track = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const [act, setAct] = useState(0);
  const [measured, setMeasured] = useState<Measured | null>(null);
  const [reduced, setReduced] = useState(false);
  const [live, setLive] = useState(true);
  const [supported, setSupported] = useState(true);
  const [cued, setCued] = useState(false);
  const [ready, setReady] = useState(false);

  useIsomorphicLayoutEffect(() => {
    setReduced(prefersReducedMotion());
    try {
      const probe = document.createElement('canvas');
      setSupported(Boolean(probe.getContext('webgl2') ?? probe.getContext('webgl')));
    } catch {
      setSupported(false);
    }
  }, []);

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
        <h1 className={styles.identityName}>
          {founderPage.wordmarkTop} {founderPage.wordmarkBottom}
        </h1>
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
      aria-label="A Raspberry Pi assembling on a bench as the page is scrolled"
    >
      <div className={styles.stage}>
        <Boot done={ready} />
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
            frameloop={live ? 'always' : 'never'}
            dpr={[1, 2]}
            shadows
            camera={{ fov: 32, near: 0.05, far: 60, position: [1.85, 1.95, 2.65] }}
            gl={{
              antialias: true,
              alpha: true,
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 0.92,
            }}
          >
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
                onMeasured={setMeasured}
                onAct={setAct}
                onCued={() => setCued(true)}
                onReady={() => setReady(true)}
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
