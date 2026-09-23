/**
 * The rocket entry's sound, synthesized with the Web Audio API — no files.
 *
 * - A space drone: four slow, detuned oscillators through a low-pass filter
 *   whose cutoff drifts, so the pad breathes.
 * - The thruster: two sawtooth oscillators through a low-pass filter, their
 *   volume shaken by filtered noise — a random gain that turns a hum into a
 *   crackling rumble — plus a band of noise for the roar. All of it follows
 *   the throttle.
 * - A chime when the rocket escapes: a pentatonic arpeggio of sine tones.
 *
 * Browsers only allow sound after the visitor does something, so this is
 * created from inside a press, never on load.
 */

export type RocketAudio = {
  setMuted(muted: boolean): void;
  /** Engine power, 0 to 1. */
  setThrust(level: number): void;
  chime(): void;
  suspend(): void;
  resume(): void;
  dispose(): void;
};

const VOLUME = 0.8;

/** C major pentatonic, climbing two octaves: no two notes can clash. */
const CHIME = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1567.98];

export function createRocketAudio(muted: boolean): RocketAudio | null {
  const Context =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) return null;

  const ctx = new Context();
  const t0 = ctx.currentTime;
  const sources: AudioScheduledSourceNode[] = [];
  const start = <T extends AudioScheduledSourceNode>(node: T): T => {
    node.start();
    sources.push(node);
    return node;
  };

  const master = ctx.createGain();
  master.gain.value = muted ? 0 : VOLUME;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -14;
  limiter.ratio.value = 8;
  master.connect(limiter);
  limiter.connect(ctx.destination);

  /* ---- the drone ---- */
  const drone = ctx.createGain();
  drone.gain.setValueAtTime(0, t0);
  drone.gain.linearRampToValueAtTime(0.06, t0 + 4);
  const droneFilter = ctx.createBiquadFilter();
  droneFilter.type = 'lowpass';
  droneFilter.frequency.value = 420;
  droneFilter.Q.value = 4;
  droneFilter.connect(drone);
  drone.connect(master);
  const voices: [number, OscillatorType, number, number][] = [
    [55, 'sine', 0, 1],
    [82.41, 'triangle', 6, 0.6],
    [110, 'sawtooth', -8, 0.18],
    [164.81, 'sine', 4, 0.35],
  ];
  voices.forEach(([frequency, type, detune, level]) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;
    osc.detune.value = detune;
    const gain = ctx.createGain();
    gain.gain.value = level;
    osc.connect(gain);
    gain.connect(droneFilter);
    start(osc);
  });
  // The sweep: the filter's cutoff drifting over about twenty seconds.
  const sweep = ctx.createOscillator();
  sweep.frequency.value = 0.05;
  const sweepDepth = ctx.createGain();
  sweepDepth.gain.value = 260;
  sweep.connect(sweepDepth);
  sweepDepth.connect(droneFilter.frequency);
  start(sweep);

  /* ---- the thruster ---- */
  const engine = ctx.createGain();
  engine.gain.value = 0;
  const engineFilter = ctx.createBiquadFilter();
  engineFilter.type = 'lowpass';
  engineFilter.frequency.value = 110;
  engineFilter.Q.value = 1.2;
  engineFilter.connect(engine);
  engine.connect(master);
  const saws = [46, 46.7].map((frequency) => {
    const saw = ctx.createOscillator();
    saw.type = 'sawtooth';
    saw.frequency.value = frequency;
    saw.connect(engineFilter);
    return start(saw);
  });

  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const samples = noiseBuffer.getChannelData(0);
  for (let i = 0; i < samples.length; i += 1) samples[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;
  start(noise);

  // The crackle: slow noise wobbling the engine's volume.
  const flutter = ctx.createBiquadFilter();
  flutter.type = 'lowpass';
  flutter.frequency.value = 70;
  const flutterDepth = ctx.createGain();
  flutterDepth.gain.value = 0;
  noise.connect(flutter);
  flutter.connect(flutterDepth);
  flutterDepth.connect(engine.gain);

  // The roar: a band of the noise itself.
  const roarFilter = ctx.createBiquadFilter();
  roarFilter.type = 'bandpass';
  roarFilter.frequency.value = 600;
  roarFilter.Q.value = 0.7;
  const roar = ctx.createGain();
  roar.gain.value = 0;
  noise.connect(roarFilter);
  roarFilter.connect(roar);
  roar.connect(master);

  return {
    setMuted(value) {
      master.gain.setTargetAtTime(value ? 0 : VOLUME, ctx.currentTime, 0.08);
    },
    setThrust(level) {
      const k = Math.max(0, Math.min(1, level));
      const t = ctx.currentTime;
      engine.gain.setTargetAtTime(0.34 * k, t, 0.06);
      flutterDepth.gain.setTargetAtTime(0.3 * k, t, 0.06);
      engineFilter.frequency.setTargetAtTime(110 + 820 * k, t, 0.08);
      saws[0].frequency.setTargetAtTime(40 + 22 * k, t, 0.1);
      saws[1].frequency.setTargetAtTime(40.6 + 22.4 * k, t, 0.1);
      roar.gain.setTargetAtTime(0.1 * k, t, 0.06);
    },
    chime() {
      const t = ctx.currentTime + 0.02;
      CHIME.forEach((frequency, i) => {
        const at = t + i * 0.085;
        const env = ctx.createGain();
        env.gain.setValueAtTime(0, at);
        env.gain.linearRampToValueAtTime(0.2, at + 0.01);
        env.gain.exponentialRampToValueAtTime(0.0001, at + 1.4);
        env.connect(master);
        [1, 2].forEach((harmonic) => {
          const tone = ctx.createOscillator();
          tone.type = 'sine';
          tone.frequency.value = frequency * harmonic;
          const level = ctx.createGain();
          level.gain.value = harmonic === 1 ? 1 : 0.22;
          tone.connect(level);
          level.connect(env);
          tone.start(at);
          tone.stop(at + 1.5);
        });
      });
    },
    suspend() {
      void ctx.suspend();
    },
    resume() {
      void ctx.resume();
    },
    dispose() {
      sources.forEach((node) => node.stop());
      void ctx.close();
    },
  };
}
