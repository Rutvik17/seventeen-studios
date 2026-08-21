/**
 * MOCHI — the studio's companion.
 *
 * A hovering vinyl robot in a vermilion sash, rigged on `lib/physics.ts` and
 * drawn to a 2D canvas. It is an original character, designed here: rounded
 * body, dark visor with two lit eyes, soft inflatable arms on inverse
 * kinematics, no legs. It floats, so the whole body is one spring against
 * gravity and everything else hangs off that.
 *
 * ---
 *
 * WHAT IS ACTUALLY SIMULATED, AND WHY IT IS NOT KEYFRAMED
 *
 * - the body's hover, as a spring with a slow driven bob
 * - each hand, as an independent 2D spring the arm then REACHES for
 * - both arms, as analytic two-bone IK from shoulder to that hand
 * - the antenna bead, as a pendulum on an accelerating pivot
 * - the head tilt, as a spring driven by where the hands ended up
 *
 * The arms are the reason this reads as a character rather than a loop. The rig
 * never animates an arm: it moves a hand TARGET and lets the spring take its
 * own path there, then solves the elbow from wherever the hand actually is this
 * frame. So an interrupted wave carries its momentum into the next gesture, the
 * elbow lags through fast moves and straightens on slow ones, and the same
 * gesture is never quite the same twice. None of that has to be authored — it
 * falls out of integrating forces instead of sampling a curve.
 *
 * The antenna is the cheapest trick here and the one people notice. It is
 * driven by the pivot's acceleration, so it whips when the body starts moving
 * and keeps swinging after it stops — the body and its accessory disagreeing
 * for a moment is most of what sells physical mass.
 *
 * ---
 *
 * DESIGN SPACE
 *
 * All geometry below is in design units with the origin at the robot's resting
 * chest height, y pointing down. The renderer scales to fit; nothing here knows
 * about pixels, device pixel ratio or canvas size.
 */

import {
  clamp,
  damp,
  Pendulum,
  solveArm,
  Spring,
  Spring2,
  type Vec2,
} from './physics';

export type CompanionPose = 'idle' | 'wave' | 'point' | 'think' | 'cheer';

export type CompanionPalette = {
  shell: string;
  shellShade: string;
  visor: string;
  eye: string;
  sash: string;
  ink: string;
  shadow: string;
};

/** Rest positions, in design units. */
const GEO = {
  headY: -78,
  headR: 60,
  bodyY: 34,
  bodyRX: 76,
  bodyRY: 84,
  shoulderX: 63,
  shoulderY: -14,
  upperArm: 50,
  foreArm: 46,
  handR: 21,
  visorW: 88,
  visorH: 42,
  visorY: -82,
  antennaTop: -138,
  antennaLen: 32,
  beadR: 7,
  groundY: 156,
} as const;

/** Where each hand rests when nothing is asking it to be anywhere. */
const HAND_REST: readonly [Vec2, Vec2] = [
  { x: -96, y: 62 },
  { x: 96, y: 62 },
];

export class Companion {
  /** Vertical hover. Everything else is drawn relative to this. */
  private hover = new Spring(0, { stiffness: 90, damping: 11 });
  /** Horizontal lean, driven by pointer and by gesture. */
  private lean = new Spring(0, { stiffness: 70, damping: 12 });
  private headTilt = new Spring(0, { stiffness: 110, damping: 13 });
  private squash = new Spring(1, { stiffness: 190, damping: 16 });

  private hands: [Spring2, Spring2] = [
    new Spring2(HAND_REST[0], { stiffness: 130, damping: 15 }),
    new Spring2(HAND_REST[1], { stiffness: 130, damping: 15 }),
  ];

  private antenna = new Pendulum(0, { length: 0.34, gravity: 9.81, damping: 1.5 });

  /** Pupil offset, in design units, springing toward the pointer. */
  private gaze = new Spring2({ x: 0, y: 0 }, { stiffness: 160, damping: 18 });

  private clock = 0;
  private blink = 0;
  private nextBlink = 2.4;
  private pose: CompanionPose = 'idle';
  private poseClock = 0;
  /** Amplitude of the talking bounce, decayed each frame. */
  private talkEnergy = 0;

  private prevBodyX = 0;
  private bodyVelX = 0;

  /**
   * Retune the rig while it is running.
   *
   * Exposed so the demo on the home page can drive the REAL character with the
   * reader's own constants rather than a copy of it — the thing on that section
   * is this class, not a diagram of it. Changing stiffness mid-flight is safe:
   * the springs keep their current value and velocity and simply start being
   * pulled harder, which is also the most legible way to feel what the number
   * does.
   */
  configure(config: { stiffness?: number; damping?: number; gravity?: number }): void {
    for (const s of [this.hover, this.lean, this.headTilt]) {
      if (config.stiffness !== undefined) s.stiffness = config.stiffness;
      if (config.damping !== undefined) s.damping = config.damping;
    }
    for (const hand of this.hands) {
      for (const s of [hand.x, hand.y]) {
        if (config.stiffness !== undefined) s.stiffness = config.stiffness;
        if (config.damping !== undefined) s.damping = config.damping;
      }
    }
    if (config.gravity !== undefined) this.antenna.gravity = config.gravity;
  }

  /** Live state, for the demo's readout. Proof the numbers are not scripted. */
  get telemetry(): { hover: number; velocity: number; antenna: number } {
    return {
      hover: this.hover.value,
      velocity: this.hover.velocity,
      antenna: (this.antenna.angle * 180) / Math.PI,
    };
  }

  setPose(pose: CompanionPose): void {
    if (pose === this.pose) return;
    this.pose = pose;
    this.poseClock = 0;
    // A pose change is an event, so it gets an impulse rather than a new
    // target alone. This is what makes a gesture start with a flick instead of
    // easing out of nothing.
    this.squash.impulse(pose === 'cheer' ? 2.4 : 1.1);
    this.antenna.impulse(pose === 'cheer' ? 5 : 2.2);
  }

  /** Call while text is being typed out; drives the talking bounce. */
  speak(): void {
    this.talkEnergy = Math.min(1, this.talkEnergy + 0.5);
  }

  /**
   * @param pointer   Pointer position in design units, or null when away.
   * @param scrollAcc Page scroll acceleration, already normalised to ±1.
   */
  update(dt: number, pointer: Vec2 | null, scrollAcc: number): void {
    this.clock += dt;
    this.poseClock += dt;
    this.talkEnergy = damp(this.talkEnergy, 0, 0.12, dt);

    /* ---- hover ------------------------------------------------------- */
    // A slow sine on the TARGET rather than on the value: the spring still has
    // to chase it, so the bob is never a clean sine and gains a little lag.
    const breath = Math.sin(this.clock * 1.15) * 9;
    const talk = Math.sin(this.clock * 26) * 5 * this.talkEnergy;
    this.hover.target = breath + talk;
    this.hover.step(dt);

    /* ---- lean and gaze ----------------------------------------------- */
    if (pointer) {
      this.lean.target = clamp(pointer.x * 0.045, -22, 22);
      this.gaze.setTarget({
        x: clamp(pointer.x * 0.03, -11, 11),
        y: clamp(pointer.y * 0.022, -7, 7),
      });
    } else {
      this.lean.target = 0;
      this.gaze.setTarget({ x: 0, y: 0 });
    }
    this.lean.step(dt);
    this.gaze.step(dt);
    this.squash.target = 1;
    this.squash.step(dt);

    /* ---- hand targets by pose ---------------------------------------- */
    const [lt, rt] = this.handTargets(pointer);
    this.hands[0].setTarget(lt);
    this.hands[1].setTarget(rt);
    this.hands[0].step(dt);
    this.hands[1].step(dt);

    /* ---- head tilt follows the hands --------------------------------- */
    // Derived, not authored. Raising one hand tips the head the other way,
    // which is a thing bodies do and a thing nobody notices until it is absent.
    const rise = (HAND_REST[1].y - this.hands[1].value.y) * 0.0016;
    const reach = (this.hands[1].value.x - HAND_REST[1].x) * 0.0009;
    this.headTilt.target = clamp(rise - reach, -0.3, 0.3);
    this.headTilt.step(dt);

    /* ---- antenna ------------------------------------------------------ */
    // The pivot's own acceleration drives it. `bodyVelX` is differenced from
    // the body's actual x, so the antenna reacts to the body being MOVED —
    // including by the pointer — not to a number we decided to feed it.
    const bodyX = this.lean.value;
    const newVel = (bodyX - this.prevBodyX) / Math.max(dt, 1e-5);
    const accel = (newVel - this.bodyVelX) * 0.012;
    this.bodyVelX = newVel;
    this.prevBodyX = bodyX;
    this.antenna.step(dt, clamp(accel + scrollAcc * 4, -40, 40));

    /* ---- blink -------------------------------------------------------- */
    this.blink = Math.max(0, this.blink - dt * 7);
    this.nextBlink -= dt;
    if (this.nextBlink <= 0) {
      this.blink = 1;
      // Irregular, and occasionally a double. Metronomic blinking is one of
      // the strongest uncanny signals there is.
      this.nextBlink = 1.6 + Math.random() * 4.2;
      if (Math.random() < 0.2) this.nextBlink = 0.22;
    }
  }

  private handTargets(pointer: Vec2 | null): [Vec2, Vec2] {
    const t = this.poseClock;
    const left = { ...HAND_REST[0] };
    const right = { ...HAND_REST[1] };
    const drift = Math.sin(this.clock * 0.9) * 5;

    switch (this.pose) {
      case 'wave': {
        // The wave is a moving TARGET, not a path the hand is placed on. The
        // spring lags it, so the hand describes a softer arc than this sine and
        // overshoots at each turn — which is what a real wave does.
        right.x = 104 + Math.sin(t * 7.5) * 26;
        right.y = -74 + Math.cos(t * 7.5) * 9;
        left.y += drift;
        break;
      }
      case 'point': {
        if (pointer) {
          right.x = clamp(pointer.x * 0.5 + 60, 40, 150);
          right.y = clamp(pointer.y * 0.4, -80, 90);
        } else {
          right.x = 132;
          right.y = -20;
        }
        left.y += drift;
        break;
      }
      case 'think': {
        // One hand to the chin, the other tucked. The chin hand gets a small
        // wander so it does not look pinned.
        right.x = 40 + Math.sin(this.clock * 1.7) * 4;
        right.y = -58 + Math.cos(this.clock * 1.3) * 3;
        left.x = -78;
        left.y = 40;
        break;
      }
      case 'cheer': {
        const lift = Math.sin(t * 9) * 14;
        right.x = 96;
        right.y = -104 + lift;
        left.x = -96;
        left.y = -104 - lift;
        break;
      }
      default: {
        left.y += drift;
        right.y -= drift;
      }
    }
    return [left, right];
  }

  /**
   * Paint one frame.
   *
   * `ctx` is expected to be already translated to the robot's origin and scaled
   * so one design unit is one unit of the current transform. The renderer owns
   * device pixel ratio and layout; this method owns only the character.
   */
  draw(ctx: CanvasRenderingContext2D, palette: CompanionPalette): void {
    const y = this.hover.value;
    const x = this.lean.value;
    const sq = this.squash.value;

    ctx.save();

    /* ---- contact shadow ---------------------------------------------- */
    // Tied to hover height: higher means smaller and fainter. It is the only
    // cue that says the character is off the ground rather than pasted on it.
    const lift = clamp((y + 12) / 40, -1, 1);
    ctx.save();
    ctx.globalAlpha = 0.3 - lift * 0.09;
    ctx.fillStyle = palette.shadow;
    ctx.beginPath();
    ctx.ellipse(x * 0.5, GEO.groundY, 84 - lift * 12, 15 - lift * 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.translate(x, y);
    // Squash and stretch, volume-preserving: wider is shorter. Scaling one axis
    // alone reads as the character changing size rather than deforming.
    ctx.scale(2 - sq, sq);

    const shoulders: [Vec2, Vec2] = [
      { x: -GEO.shoulderX, y: GEO.shoulderY },
      { x: GEO.shoulderX, y: GEO.shoulderY },
    ];

    // Left arm behind the body, right arm in front. Two draw calls around the
    // torso is the whole of the depth model, and at this silhouette it is
    // enough — the body is opaque and the overlap does the rest.
    this.drawArm(ctx, palette, shoulders[0], this.hands[0].value, true);
    this.drawBody(ctx, palette);
    this.drawHead(ctx, palette);
    this.drawArm(ctx, palette, shoulders[1], this.hands[1].value, false);

    ctx.restore();
  }

  private drawBody(ctx: CanvasRenderingContext2D, p: CompanionPalette): void {
    const { bodyY, bodyRX, bodyRY } = GEO;

    const grad = ctx.createLinearGradient(0, bodyY - bodyRY, 0, bodyY + bodyRY);
    grad.addColorStop(0, p.shell);
    grad.addColorStop(1, p.shellShade);

    ctx.beginPath();
    ctx.ellipse(0, bodyY, bodyRX, bodyRY, 0, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // The sash. Clipped to the body so it wraps instead of floating over it,
    // and drawn as a slight arc so it reads as going around a curved surface.
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, bodyY, bodyRX, bodyRY, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(-bodyRX - 4, bodyY + 6);
    ctx.quadraticCurveTo(0, bodyY + 22, bodyRX + 4, bodyY + 6);
    ctx.lineTo(bodyRX + 4, bodyY + 34);
    ctx.quadraticCurveTo(0, bodyY + 50, -bodyRX - 4, bodyY + 34);
    ctx.closePath();
    ctx.fillStyle = p.sash;
    ctx.fill();
    ctx.restore();

    // A single specular arc, upper left. One light source, stated once.
    ctx.beginPath();
    ctx.ellipse(-26, bodyY - 40, 20, 30, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.34)';
    ctx.fill();
  }

  private drawHead(ctx: CanvasRenderingContext2D, p: CompanionPalette): void {
    const { headY, headR, visorW, visorH, visorY } = GEO;
    const tilt = this.headTilt.value;

    ctx.save();
    ctx.translate(0, headY);
    ctx.rotate(tilt);

    /* antenna — drawn before the head so its root tucks behind the shell */
    const a = this.antenna.angle;
    const rootY = GEO.antennaTop - headY;
    const tipX = Math.sin(a) * GEO.antennaLen;
    const tipY = rootY - Math.cos(a) * GEO.antennaLen;
    ctx.beginPath();
    ctx.moveTo(0, rootY + 12);
    ctx.quadraticCurveTo(tipX * 0.3, rootY - 8, tipX, tipY);
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(tipX, tipY, GEO.beadR, 0, Math.PI * 2);
    ctx.fillStyle = p.sash;
    ctx.fill();

    /* head shell */
    const grad = ctx.createLinearGradient(0, -headR, 0, headR);
    grad.addColorStop(0, p.shell);
    grad.addColorStop(1, p.shellShade);
    ctx.beginPath();
    ctx.ellipse(0, 0, headR + 4, headR, 0, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    /* visor */
    const vy = visorY - headY;
    ctx.beginPath();
    roundedRect(ctx, -visorW / 2, vy - visorH / 2, visorW, visorH, visorH / 2);
    ctx.fillStyle = p.visor;
    ctx.fill();

    /* eyes — pupils spring toward the pointer, lids close on blink */
    const g = this.gaze.value;
    const open = 1 - clamp(this.blink, 0, 1);
    const eyeR = 8.5;
    for (const ex of [-19, 19]) {
      ctx.beginPath();
      ctx.ellipse(
        ex + g.x * 0.5,
        vy + g.y * 0.5,
        eyeR,
        Math.max(0.6, eyeR * open),
        0,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = p.eye;
      ctx.fill();
    }

    /* visor glare, so it reads as glass rather than a hole */
    ctx.save();
    ctx.beginPath();
    roundedRect(ctx, -visorW / 2, vy - visorH / 2, visorW, visorH, visorH / 2);
    ctx.clip();
    ctx.beginPath();
    ctx.ellipse(-24, vy - 12, 26, 8, -0.32, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  private drawArm(
    ctx: CanvasRenderingContext2D,
    p: CompanionPalette,
    shoulder: Vec2,
    hand: Vec2,
    flip: boolean,
  ): void {
    const { elbow } = solveArm(shoulder, hand, GEO.upperArm, GEO.foreArm, flip);

    // One tapered stroke through shoulder → elbow → hand. Drawn twice at
    // decreasing width rather than as a filled outline: it is fewer than half
    // the path maths for a silhouette the eye cannot tell apart at this size.
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(shoulder.x, shoulder.y);
    ctx.quadraticCurveTo(elbow.x, elbow.y, hand.x, hand.y);
    ctx.strokeStyle = p.shellShade;
    ctx.lineWidth = 30;
    ctx.stroke();
    ctx.strokeStyle = p.shell;
    ctx.lineWidth = 24;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(hand.x, hand.y, GEO.handR, 0, Math.PI * 2);
    ctx.fillStyle = p.shell;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(hand.x - 5, hand.y - 6, 7, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fill();
  }
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** The character's bounding box in design units, for the renderer's fit. */
export const COMPANION_BOUNDS = {
  minX: -170,
  maxX: 170,
  minY: GEO.antennaTop - GEO.antennaLen - 20,
  maxY: GEO.groundY + 24,
} as const;
