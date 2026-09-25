import { Rec, arr, grid, graph, vars, results, marks, bits, type Tracer, type Role } from '../trace';

const cellMarks = (cells: [number, number][], role: Role, into: Record<string, Role> = {}) => {
  for (const [r, c] of cells) into[`${r},${c}`] = role;
  return into;
};

export const traces: Record<string, Tracer> = {
  'rotate-image': ([m0]: [number[][]]) => {
    const R = new Rec();
    const m = m0.map((r) => [...r]);
    const n = m.length;
    R.add('A quarter turn clockwise = flip across the main diagonal, then reverse each row.', grid(m, { label: 'the matrix', marks: cellMarks(Array.from({ length: n }, (_, i) => [i, i] as [number, number]), 'window') }));
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        [m[i][j], m[j][i]] = [m[j][i], m[i][j]];
        R.add(`Swap (${i}, ${j}) with (${j}, ${i}): mirror images across the diagonal.`, grid(m, { label: 'flipping across the diagonal', marks: cellMarks([[i, j], [j, i]], 'active', cellMarks(Array.from({ length: n }, (_, k) => [k, k] as [number, number]), 'window')) }));
      }
    for (let r = 0; r < n; r++) {
      m[r].reverse();
      R.add(`Reverse row ${r}.`, grid(m, { label: 'reversing each row', marks: cellMarks(Array.from({ length: n }, (_, c) => [r, c] as [number, number]), 'active') }));
    }
    R.add('Turned a quarter clockwise, without a second matrix.', grid(m, { label: 'rotated', marks: cellMarks(m.flatMap((row, r) => row.map((_, c) => [r, c] as [number, number])), 'found') }));
    return R.done(m);
  },

  'spiral-matrix': ([m]: [number[][]]) => {
    const R = new Rec();
    const out: number[] = [];
    const seen: [number, number][] = [];
    let [top, bottom, left, right] = [0, m.length - 1, 0, m[0].length - 1];
    const view = (note: string, hot: [number, number][]) => R.add(note, grid(m, { label: 'the matrix — walls close in each ring', marks: cellMarks(hot, 'active', cellMarks(seen, 'done')) }), arr(out.length ? [...out] : ['∅'], { label: 'read so far' }), vars({ top, bottom, left, right }));
    view('Four walls enclose what is still unread. Read the ring along them, then move each wall in.', []);
    const take = (cells: [number, number][], note: string) => {
      if (!cells.length) return;
      for (const [r, c] of cells) out.push(m[r][c]);
      view(note, cells);
      seen.push(...cells);
    };
    while (top <= bottom && left <= right) {
      take(Array.from({ length: right - left + 1 }, (_, k) => [top, left + k] as [number, number]), `Along the top, row ${top}.`);
      take(Array.from({ length: bottom - top }, (_, k) => [top + 1 + k, right] as [number, number]), `Down the right side, column ${right}.`);
      if (top < bottom && left < right) {
        take(Array.from({ length: right - left }, (_, k) => [bottom, right - 1 - k] as [number, number]), `Back along the bottom, row ${bottom}.`);
        take(Array.from({ length: bottom - top - 1 }, (_, k) => [bottom - 1 - k, left] as [number, number]), `Up the left side, column ${left}.`);
      }
      [top, bottom, left, right] = [top + 1, bottom - 1, left + 1, right - 1];
    }
    return R.done(out);
  },

  'set-matrix-zeroes': ([m0]: [number[][]]) => {
    const R = new Rec();
    const m = m0.map((r) => [...r]);
    const rows = m.length;
    const cols = m[0].length;
    const firstRow = m[0].includes(0);
    const firstCol = m.some((r) => r[0] === 0);
    const edge = (): Record<string, Role> => cellMarks([...Array.from({ length: cols }, (_, c) => [0, c] as [number, number]), ...Array.from({ length: rows }, (_, r) => [r, 0] as [number, number])], 'window');
    R.add(`The first row and column will hold the notes. Before they are written on: does the first row hold a 0? ${firstRow ? 'Yes' : 'No'}. The first column? ${firstCol ? 'Yes' : 'No'}.`, grid(m, { label: 'the matrix — pale: the note row and column', marks: edge() }), vars({ firstRow, firstCol }));
    for (let r = 1; r < rows; r++)
      for (let c = 1; c < cols; c++)
        if (m[r][c] === 0) {
          m[r][0] = 0;
          m[0][c] = 0;
          R.add(`0 at (${r}, ${c}): note it at the start of row ${r} and the top of column ${c}.`, grid(m, { label: 'writing the notes', marks: cellMarks([[r, 0], [0, c]], 'active', cellMarks([[r, c]], 'bad', edge())) }));
        }
    for (let r = 1; r < rows; r++)
      for (let c = 1; c < cols; c++)
        if ((m[r][0] === 0 || m[0][c] === 0) && m[r][c] !== 0) m[r][c] = 0;
    R.add('Clear every inner cell whose row or column is noted.', grid(m, { label: 'cleared by the notes', marks: edge() }));
    if (firstRow) m[0].fill(0);
    if (firstCol) for (const row of m) row[0] = 0;
    R.add(firstRow || firstCol ? `Last, the ${firstRow && firstCol ? 'first row and column' : firstRow ? 'first row' : 'first column'} — cleared only now, since ${firstRow && firstCol ? 'they' : 'it'} held notes until this moment.` : 'The first row and column held no 0 of their own: they stay.', grid(m, { label: 'done', marks: cellMarks(m.flatMap((row, r) => row.map((v, c) => [r, c, v] as const)).filter(([, , v]) => v === 0).map(([r, c]) => [r, c] as [number, number]), 'bad') }));
    return R.done(m);
  },

  'happy-number': ([n]: [number]) => {
    const R = new Rec();
    const step = (x: number) => String(x).split('').reduce((a, d) => a + Number(d) ** 2, 0);
    const how = (x: number) => `${String(x).split('').map((d) => `${d}²`).join(' + ')} = ${step(x)}`;
    let slow = n;
    let fast = step(n);
    const trail: number[] = [n, fast];
    R.add(`Each step squares the digits and adds them: ${how(n)}. slow starts at ${n}, fast one step ahead.`, results('the sequence', trail.map(String)), vars({ slow, fast }));
    while (fast !== 1 && slow !== fast) {
      slow = step(slow);
      const mid = step(fast);
      fast = step(mid);
      trail.push(mid, fast);
      R.add(`slow takes one step (to ${slow}), fast two (${how(mid)}, then to ${fast}).`, results('the sequence', trail.map(String), { marks: { [trail.length - 1]: 'compare' } }), vars({ slow: [slow, 'active'], fast: [fast, 'compare'] }));
    }
    const ok = fast === 1;
    R.add(ok ? 'fast reached 1: happy.' : `slow and fast meet at ${slow}: the sequence loops without ever reaching 1. Not happy.`, vars({ answer: [ok, ok ? 'found' : 'bad'] }));
    return R.done(ok);
  },

  'plus-one': ([d0]: [number[]]) => {
    const R = new Rec();
    const d = [...d0];
    R.add('Add one to the last digit, carrying as on paper.', arr([...d], { label: 'digits' }));
    for (let i = d.length - 1; i >= 0; i--) {
      if (d[i] < 9) {
        d[i]++;
        R.add(`${d[i] - 1} + 1 = ${d[i]}: no carry. Done.`, arr([...d], { label: 'digits', marks: marks([i, 'found']) }));
        return R.done(d);
      }
      d[i] = 0;
      R.add(`9 + 1 = 10: write 0, carry 1 to the left.`, arr([...d], { label: 'digits', marks: marks([i, 'active']) }));
    }
    const out = [1, ...d];
    R.add('Every digit was 9: the carry makes a new first digit.', arr(out, { label: 'digits', marks: marks([0, 'new']) }));
    return R.done(out);
  },

  'powx-n': ([x0, n0]: [number, number]) => {
    const R = new Rec();
    let x = x0;
    let n = n0;
    if (n < 0) {
      R.add(`n is negative: x^${n0} = (1 ÷ ${x0})^${-n0}.`, vars({ x: 1 / x0, n: -n0 }));
      x = 1 / x;
      n = -n;
    }
    const b = n.toString(2);
    const fix = (v: number) => (Math.abs(v) >= 1e6 || (Math.abs(v) < 1e-4 && v !== 0) ? v.toExponential(3) : Math.round(v * 1e6) / 1e6);
    R.add(`${n} in binary is ${b}. Each 1 bit picks a power x^(2^k) to multiply in.`, bits([{ label: String(n), bits: [...b].map(Number) }]), vars({ result: 1 }));
    let result = 1;
    let k = 0;
    while (n > 0) {
      const on = n % 2 === 1;
      if (on) result *= x;
      R.add(on ? `Bit ${k} is 1: multiply in x^${2 ** k} = ${fix(x)}. Result ${fix(result)}.` : `Bit ${k} is 0: skip x^${2 ** k}.`, bits([{ label: String(n0 < 0 ? -n0 : n0), bits: [...b].map(Number), marks: { [b.length - 1 - k]: on ? 'found' : 'done' } }]), vars({ [`x^${2 ** k}`]: fix(x), result: [fix(result), 'active'] }));
      x *= x;
      n = Math.floor(n / 2);
      k++;
    }
    R.add(`${x0}^${n0} = ${fix(result)}, in ${k} squaring${k === 1 ? '' : 's'}.`, vars({ answer: [fix(result), 'found'] }));
    return R.done(result);
  },

  'multiply-strings': ([a, b]: [string, string]) => {
    const R = new Rec();
    if (a === '0' || b === '0') {
      R.add('Anything times 0 is 0.', vars({ answer: ['"0"', 'found'] }));
      return R.done('0');
    }
    const out = new Array(a.length + b.length).fill(0);
    const view = (note: string, i: number, j: number) => R.add(note, arr([...a], { label: 'num1', marks: marks([i, 'active']) }), arr([...b], { label: 'num2', marks: marks([j, 'compare']) }), arr([...out], { label: `product places (${out.length} of them)`, index: true, marks: marks([i + j + 1, 'active'], [i + j, 'compare']) }));
    view(`A ${a.length}-digit number times a ${b.length}-digit one has at most ${out.length} digits. Digit i times digit j goes to place i + j + 1.`, -2, -2);
    for (let i = a.length - 1; i >= 0; i--)
      for (let j = b.length - 1; j >= 0; j--) {
        const p = Number(a[i]) * Number(b[j]);
        const total = out[i + j + 1] + p;
        out[i + j + 1] = total % 10;
        out[i + j] += Math.floor(total / 10);
        if (R.steps.length < 120) view(`${a[i]} × ${b[j]} = ${p}; place ${i + j + 1} now holds ${total}: keep ${total % 10}, carry ${Math.floor(total / 10)} left.`, i, j);
      }
    const s = out.join('').replace(/^0+/, '');
    R.add(`Drop the leading zeros: ${a} × ${b} = ${s}.`, arr([...out], { label: 'product places', marks: marks([out.map((_, k) => k).filter((k) => k >= out.length - s.length), 'found']) }), vars({ answer: [`"${s}"`, 'found'] }));
    return R.done(s);
  },

  'detect-squares': ({ ops, args }: { ops: string[]; args: number[][][] }) => {
    const R = new Rec();
    const cnt = new Map<string, number>();
    const out: (number | null)[] = [];
    const plane = (hot: Record<string, Role> = {}, square?: [number, number][]) => {
      const pts = [...cnt.keys()].map((k) => k.split(',').map(Number) as [number, number]);
      const extra = Object.keys(hot).map((k) => k.split(',').map(Number) as [number, number]);
      const all = [...pts, ...extra];
      const xs = all.map((p) => p[0]);
      const ys = all.map((p) => p[1]);
      const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
      const sx = (v: number) => (x1 === x0 ? 0.5 : 0.08 + (0.84 * (v - x0)) / (x1 - x0));
      const sy = (v: number) => (y1 === y0 ? 0.5 : 0.92 - (0.84 * (v - y0)) / (y1 - y0));
      const ids = [...new Set([...pts, ...extra].map((p) => p.join(',')))];
      return graph(
        ids.map((k) => {
          const [x, y] = k.split(',').map(Number);
          return { id: k, label: `${x},${y}`, x: sx(x), y: sy(y), role: hot[k] ?? (cnt.has(k) ? undefined : 'compare'), badge: (cnt.get(k) ?? 0) > 1 ? `×${cnt.get(k)}` : undefined };
        }),
        square ? square.map((p, i) => ({ a: p.join(','), b: square[(i + 1) % 4].join(','), role: 'found' as Role })) : [],
        { label: 'points added — badge: how many copies' },
      );
    };
    ops.forEach((op, j) => {
      if (op === 'DetectSquares') {
        out.push(null);
        R.add('No points yet.', vars({ points: 0 }));
        return;
      }
      const [x, y] = args[j][0];
      if (op === 'add') {
        cnt.set(`${x},${y}`, (cnt.get(`${x},${y}`) ?? 0) + 1);
        out.push(null);
        R.add(`add (${x}, ${y}).`, plane({ [`${x},${y}`]: 'new' }));
        return;
      }
      let total = 0;
      const found: string[] = [];
      let square: [number, number][] | undefined;
      for (const [k, n] of cnt) {
        const [px, py] = k.split(',').map(Number);
        if (px !== x || py === y) continue;
        const d = py - y;
        for (const x2 of [x + d, x - d]) {
          const ways = n * (cnt.get(`${x2},${y}`) ?? 0) * (cnt.get(`${x2},${py}`) ?? 0);
          if (ways) {
            total += ways;
            found.push(`side ${Math.abs(d)} with (${x2}, ${y}) and (${x2}, ${py}): ${ways}`);
            square ??= [[x, y], [x, py], [x2, py], [x2, y]];
          }
        }
      }
      out.push(total);
      R.add(`count (${x}, ${y}): each point straight above or below fixes a side; look right and left for the other two corners. ${found.length ? found.join('; ') + '.' : 'None completes a square.'} Total ${total}.`, plane({ [`${x},${y}`]: 'active' }, square), vars({ returns: [total, total ? 'found' : 'bad'] }));
    });
    return R.done(out);
  },
};

