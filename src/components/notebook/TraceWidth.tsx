'use client';

/**
 * How wide does a wire have to be?
 *
 * The IPC-2221A calculation, with the inputs on sliders and every step of the
 * arithmetic printed as it changes. It is the same function the board is routed
 * from (`lib/board.ts`), not a copy — move a slider and you are running the code
 * that decided the copper on the landing page.
 *
 * ---
 *
 * WHY THIS IS AN INSTRUMENT AND NOT A PARAGRAPH
 *
 * The formula has an exponent of 1/0.725 in it, which looks arbitrary and is
 * the point at which most readers stop. Nothing about that number is
 * explainable in a sentence — but three seconds of dragging the current slider
 * makes the *shape* of it obvious: doubling the current does not double the
 * width, it roughly triples it. That is the actual lesson, and it arrives
 * through the hand rather than through the text.
 */

import { useMemo, useState } from 'react';
import { traceWidthMm } from '@/lib/board';

const MM_PER_MIL = 0.0254;

export function TraceWidth() {
  const [amps, setAmps] = useState(0.5);
  const [rise, setRise] = useState(10);
  const [oz, setOz] = useState(1);
  const [internal, setInternal] = useState(false);

  const result = useMemo(() => {
    const k = internal ? 0.024 : 0.048;
    const b = 0.44;
    const c = 0.725;
    // Recomputed here only so the intermediate can be SHOWN. The width itself
    // comes from the shared function, so the number below the working is
    // guaranteed to be the number the board was routed with.
    const area = Math.pow(amps / (k * Math.pow(rise, b)), 1 / c);
    const mm = traceWidthMm(amps, { rise, copperOz: oz, internal });
    return { k, area, mm, mils: mm / MM_PER_MIL };
  }, [amps, rise, oz, internal]);

  return (
    <div className="trace-calc">
      <div className="trace-calc__controls">
        <Slider
          label="Current"
          value={`${amps.toFixed(2)} amps`}
          min={0.05}
          max={5}
          step={0.05}
          current={amps}
          onChange={setAmps}
          hint="How much electricity the wire has to carry."
        />
        <Slider
          label="Allowed warming"
          value={`${rise} °C`}
          min={5}
          max={40}
          step={1}
          current={rise}
          onChange={setRise}
          hint="How much hotter than the room you will let it get."
        />
        <Slider
          label="Copper thickness"
          value={`${oz} oz`}
          min={0.5}
          max={3}
          step={0.5}
          current={oz}
          onChange={setOz}
          hint="Thicker copper carries more, and costs more."
        />
        <label className="trace-calc__toggle">
          <input
            type="checkbox"
            checked={internal}
            onChange={(e) => setInternal(e.target.checked)}
          />
          <span>Buried inside the board</span>
          <small>
            A buried wire has no air to shed heat into, so it needs to be
            roughly two and a half times wider for the same current.
          </small>
        </label>
      </div>

      <div className="trace-calc__working">
        <p className="trace-calc__step">
          <span className="mono-label">1 · How much copper is needed</span>
          <code>
            A = ( {amps.toFixed(2)} ÷ ( {result.k} × {rise}
            <sup>0.44</sup> ) )<sup>1÷0.725</sup> = <b>{result.area.toFixed(2)}</b>
          </code>
          <em>square thousandths of an inch of cross-section</em>
        </p>
        <p className="trace-calc__step">
          <span className="mono-label">2 · Spread over the copper you have</span>
          <code>
            w = {result.area.toFixed(2)} ÷ ( {oz} × 1.378 ) ={' '}
            <b>{result.mils.toFixed(2)}</b>
          </code>
          <em>thousandths of an inch wide</em>
        </p>
        <p className="trace-calc__answer">
          <span className="mono-label">In millimetres</span>
          <strong>{result.mm.toFixed(3)} mm</strong>
        </p>
        <p className="trace-calc__note">
          One ounce of copper spread over a square foot comes out 1.378
          thousandths of an inch thick — that is where the odd-looking constant
          comes from. And this is a <em>minimum</em>: it is the width at which
          the wire stops getting dangerously hot, not the width you should use.
          Real boards run power wider so less voltage is lost along the way.
        </p>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  current,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  current: number;
  onChange: (v: number) => void;
  hint: string;
}) {
  return (
    <label className="trace-calc__slider">
      <span className="trace-calc__slider-head">
        <span className="mono-label">{label}</span>
        <output>{value}</output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={current}
        onChange={(e) => onChange(Number(e.target.value))}
        // Announced as the formatted string, so a screen reader says "0.50
        // amps" rather than "0.5" with no unit.
        aria-valuetext={value}
      />
      <small>{hint}</small>
    </label>
  );
}
