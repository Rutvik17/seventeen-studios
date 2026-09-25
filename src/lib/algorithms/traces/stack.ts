import { Rec, stack, vars, fmt, type Tracer } from '../trace';

export const traces: Record<string, Tracer> = {
  'min-stack': ({ ops, args }: { ops: string[]; args: number[][] }) => {
    const R = new Rec();
    const st: [number, number][] = [];
    const out: (number | null)[] = [];
    const show = (hot?: 'new' | 'active' | 'found') => [
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
};
