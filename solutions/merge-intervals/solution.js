/**
 * @param {number[][]} intervals
 * @return {number[][]}
 */
function merge(intervals) {
  intervals.sort((a, b) => a[0] - b[0]); // by start: overlapping intervals are now next to each other
  const out = [];
  for (const [s, e] of intervals) {
    const last = out[out.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e); // overlaps the last one: stretch it
    else out.push([s, e]);
  }
  return out;
}
