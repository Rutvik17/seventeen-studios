import { Rec, arr, grid, vars, marks, range, type Tracer, type Role, type Val } from '../trace';

/** A table with headers, the cell being written and the cells it reads. */
function table(cells: Val[][], o: { label: string; rows?: string[]; cols?: string[]; at?: [number, number]; reads?: [number, number][]; done?: boolean; found?: [number, number][] }) {
  const m: Record<string, Role> = {};
  cells.forEach((row, r) => row.forEach((v, c) => v !== '' && v !== null && (m[`${r},${c}`] = 'done')));
  for (const [r, c] of o.found ?? []) m[`${r},${c}`] = 'found';
  for (const [r, c] of o.reads ?? []) m[`${r},${c}`] = 'compare';
  if (o.at) m[`${o.at[0]},${o.at[1]}`] = 'active';
  return grid(cells.map((row) => [...row]), { label: o.label, rows: o.rows, cols: o.cols, marks: m });
}
const blank = (r: number, c: number): Val[][] => Array.from({ length: r }, () => new Array(c).fill(''));
const heads = (s: string) => ['·', ...s];

export const traces: Record<string, Tracer> = {
  'unique-paths': ([m, n]: [number, number]) => {
    const R = new Rec();
    if (m <= 8 && n <= 10) {
      const g = blank(m, n);
      for (let r = 0; r < m; r++)
        for (let c = 0; c < n; c++) {
          g[r][c] = r === 0 || c === 0 ? 1 : (g[r - 1][c] as number) + (g[r][c - 1] as number);
          if (r > 0 && c > 0 && R.steps.length < 30) R.add(`Paths into (${r}, ${c}) come from above (${g[r - 1][c]}) or from the left (${g[r][c - 1]}): ${g[r][c]}.`, table(g, { label: 'paths into each cell', at: [r, c], reads: [[r - 1, c], [r, c - 1]] }));
        }
      R.add(`The table gives ${g[m - 1][n - 1]} — but there is a shortcut. Every path is ${m - 1} down and ${n - 1} right, in some order.`, table(g, { label: 'paths into each cell', found: [[m - 1, n - 1]] }));
    }
    const k = Math.min(m, n) - 1;
    const total = m + n - 2;
    let ways = 1;
    const steps: string[] = [];
    for (let i = 1; i <= k; i++) {
      ways = (ways * (total - k + i)) / i;
      steps.push(String(ways));
    }
    R.add(`Choose which ${k} of the ${total} moves go ${m - 1 === k ? 'down' : 'right'}: C(${total}, ${k}) = ${k ? range(1, k).map((i) => total - k + i).join(' × ') + ' ÷ (' + range(1, k).join(' × ') + ')' : '1'} = ${ways}.`, arr(steps.length ? steps : ['1'], { label: 'after each factor — always a whole number' }), vars({ answer: [ways, 'found'] }));
    return R.done(ways);
  },

  'longest-common-subsequence': ([a, b]: [string, string]) => {
    const R = new Rec();
    const t = blank(a.length + 1, b.length + 1);
    for (let i = 0; i <= a.length; i++) t[i][0] = 0;
    for (let j = 0; j <= b.length; j++) t[0][j] = 0;
    const opts = { label: 'lcs(i, j): first i letters of text1, first j of text2', rows: heads(a), cols: heads(b) };
    R.add('Row i is the first i letters of text1, column j the first j of text2. Against an empty string, nothing is shared: 0.', table(t, opts));
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++) {
        const same = a[i - 1] === b[j - 1];
        t[i][j] = same ? (t[i - 1][j - 1] as number) + 1 : Math.max(t[i - 1][j] as number, t[i][j - 1] as number);
        R.add(same ? `“${a[i - 1]}” = “${b[j - 1]}”: both end the shared part. 1 + ${t[i - 1][j - 1]} = ${t[i][j]}.` : `“${a[i - 1]}” ≠ “${b[j - 1]}”: drop one. max(${t[i - 1][j]}, ${t[i][j - 1]}) = ${t[i][j]}.`, table(t, { ...opts, at: [i, j], reads: same ? [[i - 1, j - 1]] : [[i - 1, j], [i, j - 1]] }));
      }
    const ans = t[a.length][b.length] as number;
    R.add(`The corner: ${ans}. (Each row only reads the one above, so the solutions keep a single row.)`, table(t, { ...opts, found: [[a.length, b.length]] }), vars({ answer: [ans, 'found'] }));
    return R.done(ans);
  },

  'best-time-to-buy-and-sell-stock-with-cooldown': ([prices]: [number[]]) => {
    const R = new Rec();
    let hold = -Infinity;
    let sold = 0;
    let rest = 0;
    const H: Val[] = [];
    const S: Val[] = [];
    const Z: Val[] = [];
    const f = (v: number) => (v === -Infinity ? '−∞' : v);
    const view = (note: string, i: number) => R.add(note, arr(prices, { label: 'prices', index: true, marks: marks([i, 'active']) }), arr([...H], { label: 'hold: owning a share' }), arr([...S], { label: 'sold: sold today' }), arr([...Z], { label: 'rest: free to buy' }));
    view('Three states at the end of each day. Before day 0 nobody can be holding (−∞); sold and rest are 0.', -1);
    prices.forEach((p, i) => {
      const nh = Math.max(hold, rest - p);
      const ns = hold + p;
      const nr = Math.max(rest, sold);
      const note = `Day ${i}, price ${p}. hold = max(keep ${f(hold)}, buy from rest ${rest} − ${p} = ${rest - p}) = ${f(nh)}; sold = hold ${f(hold)} + ${p} = ${f(ns)}; rest = max(${rest}, yesterday’s sold ${sold}) = ${nr}.`;
      [hold, sold, rest] = [nh, ns, nr];
      H.push(f(hold));
      S.push(f(sold));
      Z.push(rest);
      view(note, i);
    });
    const ans = Math.max(sold, rest);
    R.add(`At the end, not holding: max(sold ${sold}, rest ${rest}) = ${ans}.`, vars({ answer: [ans, 'found'] }));
    return R.done(ans);
  },

  'coin-change-ii': ([amount, coins]: [number, number[]]) => {
    const R = new Rec();
    const show = amount <= 30;
    const rows: Val[][] = [];
    let ways = new Array(amount + 1).fill(0);
    ways[0] = 1;
    const cols = range(0, amount).map(String);
    if (show) R.add('ways[x] counts the combinations making x from the kinds of coin taken so far. With none: only 0, one way.', table([[...ways]], { label: 'ways[x]', rows: ['none'], cols }));
    coins.forEach((c) => {
      const prev = ways;
      ways = [...prev];
      for (let x = c; x <= amount; x++) ways[x] = (ways[x] + ways[x - c]) >>> 0;
      rows.push([...ways]);
      if (show) R.add(`Add the ${c} coin: each x gets its old count (no ${c}) plus the new count for x − ${c} (at least one ${c}).`, table(rows, { label: 'ways[x], a row per coin added', rows: coins.slice(0, rows.length).map(String), cols, at: [rows.length - 1, amount] }));
    });
    R.add(`${ways[amount]} combination${ways[amount] === 1 ? '' : 's'} make ${amount}.`, vars({ answer: [ways[amount], 'found'] }));
    return R.done(ways[amount] | 0);
  },

  'target-sum': ([nums, target]: [number[], number]) => {
    const R = new Rec();
    const total = nums.reduce((a, b) => a + b, 0);
    if (Math.abs(target) > total || (total + target) % 2) {
      R.add(`The + group P must be (total + target) ÷ 2 = (${total} + ${target}) ÷ 2, which is ${Math.abs(target) > total ? 'out of reach' : 'not a whole number'}. No way.`, vars({ answer: [0, 'bad'] }));
      return R.done(0);
    }
    const goal = (total + target) / 2;
    const ways = new Array(goal + 1).fill(0);
    ways[0] = 1;
    R.add(`P − N = ${target} and P + N = ${total}, so the + group sums to P = (${total} + ${target}) ÷ 2 = ${goal}. Count subsets summing to ${goal}.`, arr([...ways], { label: 'ways[s]: subsets summing to s', index: true, marks: marks([goal, 'compare']) }));
    nums.forEach((x, i) => {
      for (let s = goal; s >= x; s--) ways[s] += ways[s - x];
      R.add(x === 0 ? `0: every subset can include it or not — every count doubles.` : `${x}: each sum s also gains the subsets for s − ${x}, with ${x} added.`, arr(nums, { label: 'nums', marks: marks([i, 'active'], [range(0, i - 1), 'done']) }), arr([...ways], { label: 'ways[s]', index: true, marks: marks([goal, 'found']) }));
    });
    return R.done(ways[goal]);
  },

  'interleaving-string': ([s1, s2, s3]: [string, string, string]) => {
    const R = new Rec();
    if (s1.length + s2.length !== s3.length) {
      R.add(`${s1.length} + ${s2.length} ≠ ${s3.length}: the lengths cannot add up.`, vars({ answer: [false, 'bad'] }));
      return R.done(false);
    }
    const t = blank(s1.length + 1, s2.length + 1);
    const opts = { label: 'ok(i, j): down takes from s1, right from s2', rows: heads(s1), cols: heads(s2) };
    const good: [number, number][] = [];
    for (let i = 0; i <= s1.length; i++)
      for (let j = 0; j <= s2.length; j++) {
        let ok: boolean;
        let why: string;
        if (i === 0 && j === 0) {
          ok = true;
          why = 'Nothing from either makes the empty start of s3.';
        } else {
          const k = i + j - 1;
          const a = i > 0 && t[i - 1][j] === '✓' && s1[i - 1] === s3[k];
          const b = j > 0 && t[i][j - 1] === '✓' && s2[j - 1] === s3[k];
          ok = a || b;
          why = `s3[${k}] = “${s3[k]}”: ${a ? `from s1’s “${s1[i - 1]}”` : b ? `from s2’s “${s2[j - 1]}”` : 'neither side can supply it'}.`;
        }
        t[i][j] = ok ? '✓' : '·';
        if (ok) good.push([i, j]);
        R.add(why, table(t, { ...opts, at: [i, j], reads: [...(i ? [[i - 1, j]] : []), ...(j ? [[i, j - 1]] : [])] as [number, number][], found: good }), arr([...s3], { label: 's3', marks: marks([i + j - 1 >= 0 ? i + j - 1 : null, 'active']) }));
      }
    const ans = t[s1.length][s2.length] === '✓';
    R.add(ans ? 'A path reaches the corner: s3 is an interleaving.' : 'No path reaches the corner.', vars({ answer: [ans, ans ? 'found' : 'bad'] }));
    return R.done(ans);
  },

  'longest-increasing-path-in-a-matrix': ([mat]: [number[][]]) => {
    const R = new Rec();
    const rows = mat.length;
    const cols = mat[0].length;
    const around = (r: number, c: number) => [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]].filter(([x, y]) => x >= 0 && x < rows && y >= 0 && y < cols);
    const smaller = mat.map((row, r) => row.map((v, c) => around(r, c).filter(([x, y]) => mat[x][y] < v).length));
    const layerOf: Val[][] = blank(rows, cols);
    let layer: [number, number][] = [];
    mat.forEach((row, r) => row.forEach((_, c) => smaller[r][c] === 0 && layer.push([r, c])));
    R.add('Each cell’s badge is how many neighbours are smaller. Cells with none are where increasing paths start.', grid(mat, { label: 'matrix', marks: Object.fromEntries(layer.map(([r, c]) => [`${r},${c}`, 'active'])) }), grid(smaller, { label: 'smaller neighbours' }));
    let length = 0;
    const roles: Role[] = ['compare', 'found', 'visited', 'active', 'path', 'window', 'new'];
    while (layer.length) {
      length++;
      for (const [r, c] of layer) layerOf[r][c] = length;
      const next: [number, number][] = [];
      for (const [r, c] of layer)
        for (const [x, y] of around(r, c))
          if (mat[x][y] > mat[r][c] && --smaller[x][y] === 0) next.push([x, y]);
      const m: Record<string, Role> = {};
      layerOf.forEach((row, r) => row.forEach((v, c) => v !== '' && (m[`${r},${c}`] = roles[((v as number) - 1) % roles.length])));
      R.add(`Layer ${length}: ${layer.length} cell${layer.length === 1 ? '' : 's'} — each ends a path of ${length} cell${length === 1 ? '' : 's'}. Removing them frees ${next.length} more.`, grid(mat, { label: 'matrix, painted by layer', marks: m }), grid(layerOf.map((row) => [...row]), { label: 'layer', marks: Object.fromEntries(layer.map(([r, c]) => [`${r},${c}`, 'active'])) }));
      layer = next;
    }
    R.add(`${length} layers: the longest increasing path has ${length} cells.`, vars({ answer: [length, 'found'] }));
    return R.done(length);
  },

  'distinct-subsequences': ([s, t]: [string, string]) => {
    const R = new Rec();
    const ways = [1, ...new Array(t.length).fill(0)];
    const rows: Val[][] = [[...ways]];
    const cols = heads(t);
    R.add('ways[j]: ways to spell the first j letters of t from what has been read of s. The empty start is spelled one way.', table(rows, { label: 'ways[j] after each letter of s', rows: ['·'], cols }));
    [...s].forEach((ch, i) => {
      const hit: number[] = [];
      for (let j = t.length; j >= 1; j--)
        if (t[j - 1] === ch) {
          ways[j] = (ways[j] + ways[j - 1]) >>> 0;
          hit.push(j);
        }
      rows.push([...ways]);
      if (R.steps.length < 60) R.add(hit.length ? `“${ch}”: it can finish t[0..${hit.map((j) => j).join('), t[0..')}) — each such count gains the one to its left.` : `“${ch}” is not in t: every count stays.`, table(rows, { label: 'ways[j] after each letter of s', rows: ['·', ...s.slice(0, i + 1)], cols, at: hit.length ? [i + 1, hit[0]] : undefined, reads: hit.map((j) => [i, j - 1] as [number, number]) }));
    });
    R.add(`${ways[t.length]} way${ways[t.length] === 1 ? '' : 's'} to spell “${t}”.`, vars({ answer: [ways[t.length], 'found'] }));
    return R.done(ways[t.length] | 0);
  },

  'edit-distance': ([a, b]: [string, string]) => {
    const R = new Rec();
    const d = blank(a.length + 1, b.length + 1);
    for (let i = 0; i <= a.length; i++) d[i][0] = i;
    for (let j = 0; j <= b.length; j++) d[0][j] = j;
    const opts = { label: 'd(i, j): edits from word1[0..i) to word2[0..j)', rows: heads(a), cols: heads(b) };
    R.add('To or from an empty word: j inserts, or i deletes.', table(d, opts));
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++) {
        if (a[i - 1] === b[j - 1]) {
          d[i][j] = d[i - 1][j - 1];
          R.add(`“${a[i - 1]}” = “${b[j - 1]}”: free. ${d[i][j]}.`, table(d, { ...opts, at: [i, j], reads: [[i - 1, j - 1]] }));
        } else {
          const [del, ins, rep] = [d[i - 1][j] as number, d[i][j - 1] as number, d[i - 1][j - 1] as number];
          d[i][j] = 1 + Math.min(del, ins, rep);
          R.add(`“${a[i - 1]}” ≠ “${b[j - 1]}”: 1 + min(delete ${del}, insert ${ins}, replace ${rep}) = ${d[i][j]}.`, table(d, { ...opts, at: [i, j], reads: [[i - 1, j], [i, j - 1], [i - 1, j - 1]] }));
        }
      }
    const ans = d[a.length][b.length] as number;
    R.add(`${ans} edit${ans === 1 ? '' : 's'}.`, table(d, { ...opts, found: [[a.length, b.length]] }), vars({ answer: [ans, 'found'] }));
    return R.done(ans);
  },

  'burst-balloons': ([nums]: [number[]]) => {
    const R = new Rec();
    const v = [1, ...nums, 1];
    const n = v.length;
    const best: Val[][] = blank(n, n);
    for (let l = 0; l + 1 < n; l++) best[l][l + 1] = 0;
    const heads2 = v.map((x, i) => `${i}:${x}`);
    R.add('Pad with a 1 at each end. best(l, r): the most coins from bursting everything strictly between l and r. Neighbours have nothing between: 0.', arr(v, { label: 'balloons, padded', index: true, marks: marks([[0, n - 1], 'done']) }), table(best, { label: 'best(l, r)', rows: heads2, cols: heads2 }));
    for (let gap = 2; gap < n; gap++)
      for (let l = 0; l + gap < n; l++) {
        const r = l + gap;
        let top = -1;
        let at = -1;
        for (let k = l + 1; k < r; k++) {
          const val = (best[l][k] as number) + v[l] * v[k] * v[r] + (best[k][r] as number);
          if (val > top) [top, at] = [val, k];
        }
        best[l][r] = top;
        R.add(`Between ${l} and ${r}, burst ${at} (${v[at]}) last: ${best[l][at]} + ${v[l]} × ${v[at]} × ${v[r]} + ${best[at][r]} = ${top}.`, arr(v, { label: 'balloons, padded', index: true, range: { from: l + 1, to: r - 1, role: 'window' }, marks: marks([[l, r], 'compare'], [at, 'active']) }), table(best, { label: 'best(l, r)', rows: heads2, cols: heads2, at: [l, r], reads: [[l, at], [at, r]] }));
      }
    const ans = best[0][n - 1] as number;
    R.add(`Everything between the two padding 1s: ${ans} coins.`, vars({ answer: [ans, 'found'] }));
    return R.done(ans);
  },

  'regular-expression-matching': ([s, p]: [string, string]) => {
    const R = new Rec();
    const m = s.length;
    const n = p.length;
    const t = blank(m + 1, n + 1);
    const opts = { label: 'match(i, j): does s[i..] match p[j..]?', rows: [...s, '∅'], cols: [...p, '∅'] };
    t[m][n] = '✓';
    for (let i = 0; i < m; i++) t[i][n] = '·';
    R.add('An exhausted pattern matches only an exhausted string. Now fill from the ends back to the start.', table(t, { ...opts, found: [[m, n]] }));
    const ok = (i: number, j: number) => t[i][j] === '✓';
    for (let i = m; i >= 0; i--)
      for (let j = n - 1; j >= 0; j--) {
        const first = i < m && (p[j] === s[i] || p[j] === '.');
        let val: boolean;
        let note: string;
        let reads: [number, number][];
        if (j + 1 < n && p[j + 1] === '*') {
          val = ok(i, j + 2) || (first && ok(i + 1, j));
          reads = [[i, j + 2], ...(first ? [[i + 1, j] as [number, number]] : [])];
          note = `“${p[j]}*”: skip it (${ok(i, j + 2) ? 'matches' : 'no'})${first ? `, or let it eat “${s[i]}” and stay (${ok(i + 1, j) ? 'matches' : 'no'})` : i < m ? ` — it cannot eat “${s[i]}”` : ''}.`;
        } else {
          val = first && ok(i + 1, j + 1);
          reads = first ? [[i + 1, j + 1]] : [];
          note = p[j] === '*' ? '“*” is read together with the letter before it.' : `“${p[j]}” ${first ? `matches “${s[i]}”; the rest must match too` : i < m ? `does not match “${s[i]}”` : 'needs a letter, but s is used up'}.`;
        }
        t[i][j] = val ? '✓' : '·';
        R.add(note, table(t, { ...opts, at: [i, j], reads }));
      }
    const ans = ok(0, 0);
    R.add(ans ? 'The top-left cell: the whole pattern matches the whole string.' : 'The top-left cell says no.', vars({ answer: [ans, ans ? 'found' : 'bad'] }));
    return R.done(ans);
  },
};
