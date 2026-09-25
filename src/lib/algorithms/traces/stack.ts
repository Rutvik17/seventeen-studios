import { Rec, arr, bars, stack, vars, marks, results, intervals, fmt, range, type Tracer, type Role } from '../trace';

export const traces: Record<string, Tracer> = {
  'valid-parentheses': ([s]: [string]) => {
    const R = new Rec();
    const st: string[] = [];
    const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
    R.add('Push each opener. A closer must match the most recent opener still open — the top of the stack.', arr([...s], { label: 's' }), stack(st, { label: 'open brackets' }));
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (!(c in pairs)) {
        st.push(c);
        R.add(`'${c}' opens: push it.`, arr([...s], { label: 's', marks: marks([i, 'active']), ptrs: [{ at: i, label: 'i' }] }), stack(st, { label: 'open brackets', marks: { [st.length - 1]: 'new' } }));
        continue;
      }
      const top = st[st.length - 1];
      if (top !== pairs[c]) {
        R.add(top === undefined ? `'${c}' closes, but nothing is open. Invalid.` : `'${c}' closes, but the most recent opener is '${top}'. Wrong kind — invalid.`, arr([...s], { label: 's', marks: marks([i, 'bad']), ptrs: [{ at: i, label: 'i', role: 'bad' }] }), stack(st, { label: 'open brackets', marks: st.length ? { [st.length - 1]: 'bad' } : {} }), vars({ answer: [false, 'bad'] }));
        return R.done(false);
      }
      R.add(`'${c}' closes the '${top}' on top. Pop it.`, arr([...s], { label: 's', marks: marks([i, 'found']), ptrs: [{ at: i, label: 'i', role: 'found' }] }), stack(st, { label: 'open brackets', marks: { [st.length - 1]: 'found' } }));
      st.pop();
    }
    const ok = st.length === 0;
    R.add(ok ? 'Every opener was closed, in order. Valid.' : `The string ended with ${st.length} bracket${st.length === 1 ? '' : 's'} never closed. Invalid.`, arr([...s], { label: 's' }), stack(st, { label: 'open brackets', marks: Object.fromEntries(st.map((_, k) => [k, 'bad'])) }), vars({ answer: [ok, ok ? 'found' : 'bad'] }));
    return R.done(ok);
  },

  'min-stack': ({ ops, args }: { ops: string[]; args: number[][] }) => {
    const R = new Rec();
    const st: [number, number][] = [];
    const out: (number | null)[] = [];
    const show = (hot?: 'new' | 'active') => [
      stack(st.map(([v]) => v), { label: 'values', marks: hot && st.length ? { [st.length - 1]: hot } : {} }),
      stack(st.map(([, m]) => m), { label: 'smallest from here down', marks: hot && st.length ? { [st.length - 1]: hot === 'new' ? 'new' : 'found' } : {} }),
    ];
    ops.forEach((op, k) => {
      const a = args[k];
      if (op === 'MinStack') {
        out.push(null);
        R.add('A new, empty stack. Each entry will carry its value and the smallest value at or below it.', ...show());
      } else if (op === 'push') {
        const v = a[0];
        const below = st.length ? st[st.length - 1][1] : null;
        const m = below === null ? v : Math.min(v, below);
        st.push([v, m]);
        out.push(null);
        R.add(`push(${v}): the smallest below is ${below === null ? 'nothing' : below}, so this entry's minimum is ${m}.`, ...show('new'));
      } else if (op === 'pop') {
        const [v] = st.pop()!;
        out.push(null);
        R.add(`pop(): remove ${v}. The entry underneath still remembers its own minimum — nothing to recompute.`, ...show());
      } else if (op === 'top') {
        out.push(st[st.length - 1][0]);
        R.add(`top() → ${st[st.length - 1][0]}, the value on top.`, ...show('active'), vars({ returns: [st[st.length - 1][0], 'found'] }));
      } else if (op === 'getMin') {
        out.push(st[st.length - 1][1]);
        R.add(`getMin() → ${st[st.length - 1][1]}: read straight off the top entry, in one step.`, ...show('active'), vars({ returns: [st[st.length - 1][1], 'found'] }));
      }
    });
    R.add(`All operations done: ${fmt(out)}.`, ...show());
    return R.done(out);
  },

  'evaluate-reverse-polish-notation': ([tokens]: [string[]]) => {
    const R = new Rec();
    const st: number[] = [];
    R.add('Read left to right. Numbers wait on the stack; an operator takes the top two and pushes the result.', arr(tokens, { label: 'tokens' }), stack(st, { label: 'stack' }));
    tokens.forEach((tok, i) => {
      if ('+-*/'.includes(tok) && tok.length === 1) {
        const b = st.pop()!;
        const a = st.pop()!;
        const v = tok === '+' ? a + b : tok === '-' ? a - b : tok === '*' ? a * b : Math.trunc(a / b);
        st.push(v + 0);
        const sym = tok === '*' ? '×' : tok === '/' ? '÷' : tok === '-' ? '−' : '+';
        R.add(`'${tok}': pop ${b} (right) and ${a} (left). ${a} ${sym} ${b} = ${v}${tok === '/' && a % b !== 0 ? ', truncated toward zero' : ''}. Push it.`, arr(tokens, { label: 'tokens', marks: marks([i, 'active']), ptrs: [{ at: i, label: 'i' }] }), stack(st, { label: 'stack', marks: { [st.length - 1]: 'new' } }));
      } else {
        st.push(Number(tok));
        R.add(`${tok} is a number: push it.`, arr(tokens, { label: 'tokens', marks: marks([i, 'compare']), ptrs: [{ at: i, label: 'i' }] }), stack(st, { label: 'stack', marks: { [st.length - 1]: 'new' } }));
      }
    });
    R.add(`The tokens are used up. The one number left, ${st[0]}, is the value.`, arr(tokens, { label: 'tokens' }), stack(st, { label: 'stack', marks: { 0: 'found' } }), vars({ answer: [st[0], 'found'] }));
    return R.done(st[0]);
  },

  'generate-parentheses': ([n]: [number]) => {
    const R = new Rec(300);
    const out: string[] = [];
    const path: string[] = [];
    const view = (note: string, role?: Role) => R.add(note, arr(path.length ? path : [], { label: 'being built', index: false, marks: role && path.length ? marks([path.length - 1, role]) : {} }), vars({ opened: path.filter((c) => c === '(').length, closed: path.filter((c) => c === ')').length, n }), results('complete', out, { marks: role === 'found' ? { [out.length - 1]: 'new' } : {} }));
    view(`Build strings of ${n} pairs one character at a time, adding only characters that keep them valid.`);
    const build = (o: number, c: number) => {
      if (path.length === 2 * n) {
        out.push(path.join(''));
        view(`Length ${2 * n}: "${path.join('')}" is complete. Record it, and step back.`, 'found');
        return;
      }
      if (o < n) {
        path.push('(');
        view(`${o} of ${n} openers used, so '(' is allowed.`, 'active');
        build(o + 1, c);
        path.pop();
      }
      if (c < o) {
        path.push(')');
        view(`${o} opened and ${c} closed: a ')' has something to close.`, 'compare');
        build(o, c + 1);
        path.pop();
      }
    };
    build(0, 0);
    R.add(`All ${out.length} well-formed strings of ${n} pairs.`, results('complete', out, { marks: Object.fromEntries(out.map((_, k) => [k, 'found'])) }));
    return R.done(out);
  },

  'daily-temperatures': ([t]: [number[]]) => {
    const R = new Rec();
    const out = new Array(t.length).fill(0);
    const st: number[] = [];
    const done = new Set<number>();
    R.add('Days still waiting for a warmer one sit on a stack, coolest on top. Each new day settles every cooler day waiting.', bars(t, { label: 'temperatures' }), stack(st, { label: 'waiting days' }), arr(out, { label: 'answer' }));
    t.forEach((temp, i) => {
      const settled: number[] = [];
      while (st.length && t[st[st.length - 1]] < temp) {
        const j = st.pop()!;
        out[j] = i - j;
        settled.push(j);
        done.add(j);
      }
      st.push(i);
      R.add(settled.length ? `Day ${i} (${temp}°) is warmer than waiting day${settled.length > 1 ? 's' : ''} ${settled.join(', ')}: ${settled.map((j) => `answer[${j}] = ${i} − ${j} = ${i - j}`).join('; ')}. Then day ${i} waits.` : `Day ${i} (${temp}°) is no warmer than the day on top. It waits too.`, bars(t, { label: 'temperatures', marks: marks([settled, 'found'], [i, 'active'], [st.slice(0, -1), 'window']), ptrs: [{ at: i, label: 'i' }] }), stack(st.map((d) => `day ${d}: ${t[d]}°`), { label: 'waiting days', marks: { [st.length - 1]: 'new' } }), arr(out, { label: 'answer', marks: marks([settled, 'new']) }));
    });
    R.add(`The days left on the stack never see a warmer day: their answer stays 0.`, bars(t, { label: 'temperatures' }), stack(st.map((d) => `day ${d}: ${t[d]}°`), { label: 'waiting days', marks: Object.fromEntries(st.map((_, k) => [k, 'done'])) }), arr(out, { label: 'answer', marks: marks([range(0, out.length - 1), 'found']) }));
    return R.done(out);
  },

  'car-fleet': ([target, position, speed]: [number, number[], number[]]) => {
    const R = new Rec();
    const cars = position.map((p, i) => ({ p, s: speed[i], t: (target - p) / speed[i] })).sort((a, b) => b.p - a.p);
    const fmtT = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(2));
    const colours: Role[] = ['found', 'compare', 'path', 'visited', 'active', 'new'];
    const fleetOf: number[] = [];
    let fleets = 0;
    let slowest = 0;
    const road = (upto: number) =>
      intervals(
        cars.map((c, k) => ({ s: c.p, e: target, role: k < upto ? colours[fleetOf[k] % colours.length] : k === upto ? 'active' : undefined, label: `car at ${c.p}, speed ${c.s}: arrives at ${fmtT(c.t)}` })),
        { label: 'the road, nearest the target first', min: 0, max: target },
      );
    R.add(`Take the cars nearest the target first. On its own, a car arrives at (target − position) ÷ speed.`, road(-1), vars({ fleets }));
    cars.forEach((c, k) => {
      if (c.t > slowest) {
        fleetOf.push(fleets);
        fleets++;
        R.add(`The car at ${c.p} would arrive at ${fmtT(c.t)}, later than the fleet ahead (${k ? fmtT(slowest) : 'none'}). It can never catch up: a new fleet.`, road(k + 1), vars({ fleets: [fleets, 'found'], 'fleet ahead arrives': fmtT(c.t) }));
        slowest = c.t;
      } else {
        fleetOf.push(fleets - 1);
        R.add(`The car at ${c.p} would arrive at ${fmtT(c.t)}, no later than the fleet ahead (${fmtT(slowest)}). It catches up and joins that fleet.`, road(k + 1), vars({ fleets, 'fleet ahead arrives': fmtT(slowest) }));
      }
    });
    R.add(`${fleets} fleet${fleets === 1 ? '' : 's'} arrive${fleets === 1 ? 's' : ''} — one colour each.`, road(cars.length), vars({ answer: [fleets, 'found'] }));
    return R.done(fleets);
  },

  'largest-rectangle-in-histogram': ([h]: [number[]]) => {
    const R = new Rec();
    const st: [number, number][] = [];
    let best = 0;
    let bestRect = { from: 0, to: 0, h: 0 };
    R.add('Keep bars on a stack in increasing height, each with the leftmost index it can reach. A shorter bar cuts off the taller ones.', bars(h, { label: 'heights' }), stack([], { label: 'stack (start, height)' }), vars({ best }));
    for (let i = 0; i <= h.length; i++) {
      const cur = i === h.length ? 0 : h[i];
      let start = i;
      while (st.length && st[st.length - 1][1] >= cur) {
        const [j, hj] = st.pop()!;
        const area = hj * (i - j);
        const better = area > best;
        if (better) {
          best = area;
          bestRect = { from: j, to: i - 1, h: hj };
        }
        R.add(`${i === h.length ? 'The end' : `Height ${cur} at ${i}`} cuts off the bar of height ${hj} that started at ${j}: area ${hj} × (${i} − ${j}) = ${area}.${better ? ' The best so far.' : ''}`, bars(h, { label: 'heights', ptrs: i < h.length ? [{ at: i, label: 'i' }] : [], area: { from: j, to: i - 1, h: hj, role: better ? 'found' : 'window' } }), stack(st.map(([a, b]) => `${a}, ${b}`), { label: 'stack (start, height)' }), vars({ area, best: [best, better ? 'found' : 'active'] }));
        start = j;
      }
      if (i < h.length) {
        st.push([start, cur]);
        R.add(`Push bar ${i} (height ${cur})${start < i ? `; it can reach back to index ${start}, where the last bar it cut off began` : ''}.`, bars(h, { label: 'heights', marks: marks([i, 'active']), ptrs: [{ at: i, label: 'i' }] }), stack(st.map(([a, b]) => `${a}, ${b}`), { label: 'stack (start, height)', marks: { [st.length - 1]: 'new' } }), vars({ best }));
      }
    }
    R.add(`The largest rectangle has area ${best}.`, bars(h, { label: 'heights', area: { ...bestRect, role: 'found' } }), vars({ answer: [best, 'found'] }));
    return R.done(best);
  },
};
