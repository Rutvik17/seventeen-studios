'use client';

/**
 * The working, act by act.
 *
 * This is what makes the assembly a portfolio piece rather than an animation.
 * The site's seventh non-negotiable is that every number on it is computed and
 * shows its working, and a 3D model is the easiest place in the world to break
 * that rule — a caption saying "85 mm" beside a render is a claim about a
 * picture, checkable by nobody.
 *
 * So act one does not assert the board's size. It MEASURES the asset, prints
 * what the vertices actually say, prints what `device.ts` declares, and prints
 * whether they agree. If the model is ever re-exported at a different scale the
 * page says so on screen. Everything after it is arithmetic on figures that
 * have been checked that way, or on the panel's own declared geometry.
 */

import {
  ACTS,
  BOARD,
  GPIO_SPAN_MM,
  MEMORY,
  PANEL,
  SPI,
  framebufferBytes,
  frameClockMs,
  memoryBandwidthGBs,
  pitchMm,
  ppi,
} from '@/lib/founder/device';
import type { Measured } from '@/lib/founder/model';
import styles from '@/components/founder/Founder.module.css';

type ReadoutProps = {
  act: number;
  measured: Measured | null;
  reduced: boolean;
};

export function Readout({ act, measured, reduced }: ReadoutProps) {
  if (reduced) {
    /*
      Reduced motion gets the whole story at once rather than a stripped one.
      Studio rule 5: an alternative expression, not an absence. Every act's
      caption and every act's working is present; only the scrubbing is gone.
    */
    return (
      <aside className={styles.readout} data-static="true">
        <ol className={styles.acts}>
          {ACTS.map((a, index) => (
            <li key={a.index}>
              <p className={`mono-label ${styles.actLine}`}>
                <span>{a.index}</span> {a.title}
              </p>
              <p className={styles.caption}>{a.caption}</p>
              <Working act={index} measured={measured} />
            </li>
          ))}
        </ol>
      </aside>
    );
  }

  const current = ACTS[act] ?? ACTS[0];

  return (
    <aside className={styles.readout} aria-live="polite">
      <p className={`mono-label ${styles.actLine}`}>
        <span>{current.index}</span> {current.title}
      </p>
      <p className={styles.caption}>{current.caption}</p>
      {/*
        Every act's working is rendered and all but the current one is hidden,
        rather than one being swapped for another.

        The landing page learned this the hard way. On a phone the readout sits
        UNDER the drawing in a single column, so its height is subtracted from
        the drawing's row — and these blocks differ by about 90px between the
        shortest act and the tallest. Swapping them moves the canvas mid-scroll
        and shrinks it. Stacking them in one grid cell makes the block as tall as
        the TALLEST act at every act, so nothing moves, and the reserved height
        stays correct on its own if the copy changes.
      */}
      <div className={styles.working}>
        {ACTS.map((a, index) => (
          <div
            className={styles.slot}
            key={a.index}
            data-current={index === act ? '' : undefined}
            aria-hidden={index === act ? undefined : true}
          >
            <Working act={index} measured={measured} />
          </div>
        ))}
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */

function Working({ act, measured }: { act: number; measured: Measured | null }) {
  if (act === 0) return <Substrate measured={measured} />;
  if (act === 1) return <Silicon />;
  if (act === 2) return <Interfaces measured={measured} />;
  if (act === 3) return <Link />;
  return <Panel />;
}

/**
 * Act 01 — the asset, checked against the specification.
 *
 * The interesting column here is "measured": those millimetres are read off the
 * PCB mesh's own vertex data at load time, not typed. `agrees` is the whole
 * point of the block — it is the difference between a page that claims a
 * dimension and a page that verifies one.
 */
function Substrate({ measured }: { measured: Measured | null }) {
  return (
    <dl className={styles.calc}>
      <dt className="mono-label">The asset, measured against the part</dt>
      <dd>
        {measured ? (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">&nbsp;</th>
                  <th scope="col">measured</th>
                  <th scope="col">declared</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">width</th>
                  <td>{measured.board.width.toFixed(2)} mm</td>
                  <td>{BOARD.width.toFixed(2)} mm</td>
                </tr>
                <tr>
                  <th scope="row">depth</th>
                  <td>{measured.board.height.toFixed(2)} mm</td>
                  <td>{BOARD.height.toFixed(2)} mm</td>
                </tr>
                <tr>
                  <th scope="row">laminate</th>
                  <td>{measured.board.thickness.toFixed(2)} mm</td>
                  <td>{BOARD.thickness.toFixed(2)} mm</td>
                </tr>
              </tbody>
            </table>
            <p className={styles.note}>
              {measured.triangles.toLocaleString()} triangles across{' '}
              {measured.gpioPins} pins and every connector.{' '}
              {measured.agrees
                ? 'Read off the mesh vertices at load, and they agree — so every figure below is about this object rather than about a caption.'
                : 'These do not agree, which means the model has been re-exported at a different scale and the figures below describe the part rather than the asset.'}
            </p>
          </>
        ) : (
          <p className={styles.note}>Measuring the asset…</p>
        )}
      </dd>
    </dl>
  );
}

/** Act 02 — what the memory beside the processor can actually move. */
function Silicon() {
  return (
    <dl className={styles.calc}>
      <dt className="mono-label">{MEMORY.type} · {MEMORY.busBits}-bit bus</dt>
      <dd>
        bandwidth = transfers/s × bus ÷ 8
        <br />
        = {(MEMORY.transfersPerSecond / 1e6).toLocaleString()} MT/s × {MEMORY.busBits} ÷ 8
        <br />= <strong>{memoryBandwidthGBs().toFixed(1)} GB/s</strong>
        <br />
        <span className={styles.note}>
          The 3200 is the transfer rate, not the clock. The bus runs at 1600 MHz
          and moves data on both edges of it, which is what &ldquo;double data
          rate&rdquo; means — quoting the clock instead is the usual way this
          figure ends up stated at half its true value.
        </span>
      </dd>
    </dl>
  );
}

/**
 * Act 03 — the header, measured.
 *
 * 2.54 mm is 0.1", the pitch every hat, ribbon and breadboard in existence
 * assumes. Measuring it is the cheapest possible test of whether the model is
 * dimensionally real or merely looks it.
 */
function Interfaces({ measured }: { measured: Measured | null }) {
  const pins = BOARD.gpioPins;
  const gaps = pins / 2 - 1;
  return (
    <dl className={styles.calc}>
      <dt className="mono-label">GPIO header · {pins} pins, two rows</dt>
      <dd>
        span = {gaps} gaps × {BOARD.gpioPitch} mm = {GPIO_SPAN_MM.toFixed(2)} mm
        {measured && measured.gpioPitch > 0 ? (
          <>
            <br />
            measured = {(measured.gpioPitch * gaps).toFixed(2)} mm ÷ {gaps} ={' '}
            <strong>{measured.gpioPitch.toFixed(3)} mm</strong>
          </>
        ) : null}
        <br />
        <span className={styles.note}>
          Twenty pins to a row is <em>nineteen</em> gaps, not twenty — and
          measuring across all forty would measure the header&rsquo;s diagonal
          and report a pitch about a third of a percent high. Small enough to
          look right, which is the only kind of wrong worth writing a comment
          about. 2.54 mm is 0.1&Prime;, and it is why any hat ever made fits
          this board.
        </span>
      </dd>
    </dl>
  );
}

/**
 * Act 04 — the wire is not the bottleneck.
 *
 * This is the best number on the page. Getting the image to the panel takes
 * about ten milliseconds; getting the pigment to move takes two seconds. Two
 * hundred times longer, and none of it is electrical.
 */
function Link() {
  const bytes = framebufferBytes();
  const ms = frameClockMs();
  const ratio = (PANEL.fullRefreshSeconds * 1000) / ms;
  return (
    <dl className={styles.calc}>
      <dt className="mono-label">
        SPI · {SPI.wires.join(', ')} · {(SPI.clockHz / 1e6).toFixed(0)} MHz
      </dt>
      <dd>
        framebuffer = {PANEL.width} × {PANEL.height} ÷ 8 ={' '}
        {bytes.toLocaleString()} bytes
        <br />
        clocked out = {bytes.toLocaleString()} × 8 ÷ {(SPI.clockHz / 1e6).toFixed(0)} MHz ={' '}
        <strong>{ms.toFixed(2)} ms</strong>
        <br />
        refresh = {PANEL.fullRefreshSeconds.toFixed(1)} s ={' '}
        <strong>{Math.round(ratio)}×</strong> longer
        <br />
        <span className={styles.note}>
          One bit per pixel, because there are two pigments and nothing in
          between. The wire was never the constraint — dragging titanium dioxide
          through oil is. Four conductors is enough to clock a panel; a shipped
          driver wants four more (chip select, data/command, reset, and a busy
          line so the host knows when the pigment has stopped moving).
        </span>
      </dd>
    </dl>
  );
}

/** Act 05 — the panel's real geometry, and what two pigments buy. */
function Panel() {
  const across = ppi(PANEL.width, PANEL.activeWidth);
  const down = ppi(PANEL.height, PANEL.activeHeight);
  return (
    <dl className={styles.calc}>
      <dt className="mono-label">
        2.9&Prime; panel · {PANEL.width} × {PANEL.height} over {PANEL.activeWidth} ×{' '}
        {PANEL.activeHeight} mm
      </dt>
      <dd>
        across = {PANEL.width} ÷ ({PANEL.activeWidth} ÷ 25.4) ={' '}
        <strong>{across.toFixed(1)} PPI</strong>
        <br />
        down = {PANEL.height} ÷ ({PANEL.activeHeight} ÷ 25.4) ={' '}
        <strong>{down.toFixed(1)} PPI</strong>
        <br />
        pitch = {pitchMm(PANEL.width, PANEL.activeWidth).toFixed(4)} ×{' '}
        {pitchMm(PANEL.height, PANEL.activeHeight).toFixed(4)} mm
        <br />
        <span className={styles.note}>
          Not square, and the readout says so rather than rounding a real
          asymmetry out of existence. The clock on the panel is the other half of
          the trade: this part holds two pigments where the board on the landing
          page holds seven, so it has partial refresh and can redraw a corner in{' '}
          {PANEL.partialRefreshSeconds.toFixed(1)} s — and it has no red and no
          green, so a rise and a fall cannot be coloured and the face has to carry
          the whole mood on its own.
        </span>
      </dd>
    </dl>
  );
}
