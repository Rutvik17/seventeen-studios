/**
 * @param {number[][]} intervals
 * @return {number}
 */
function minMeetingRooms(intervals) {
  // Sweep through time. Each start needs a room; each end frees one. The most rooms
  // busy at once is the answer. An end at the same moment as a start frees its room first.
  const starts = intervals.map((iv) => iv[0]).sort((a, b) => a - b);
  const ends = intervals.map((iv) => iv[1]).sort((a, b) => a - b);
  let busy = 0;
  let best = 0;
  let j = 0;
  for (const s of starts) {
    while (ends[j] <= s) {
      // meetings finished by now
      busy--;
      j++;
    }
    best = Math.max(best, ++busy);
  }
  return best;
}
