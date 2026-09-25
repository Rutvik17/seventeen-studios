/**
 * @param {number[][]} intervals
 * @return {number}
 */
function eraseOverlapIntervals(intervals) {
  // Keep as many as possible: always keep the one that ends first — it leaves the most room.
  intervals.sort((a, b) => a[1] - b[1]);
  let kept = 0;
  let end = -Infinity;
  for (const [s, e] of intervals) {
    if (s >= end) {
      // fits after the last one kept (touching is fine)
      kept++;
      end = e;
    }
  }
  return intervals.length - kept;
}
