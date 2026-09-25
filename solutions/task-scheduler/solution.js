/**
 * @param {character[]} tasks
 * @param {number} n
 * @return {number}
 */
function leastInterval(tasks, n) {
  const count = new Array(26).fill(0);
  for (const t of tasks) count[t.charCodeAt(0) - 65]++;
  const most = Math.max(...count); // how often the commonest task occurs
  const tied = count.filter((c) => c === most).length; // how many tasks occur that often
  // The commonest task needs (most - 1) frames of n + 1 slots, then one last run holding
  // every task tied for commonest. If other tasks overflow the frames, nothing idles.
  return Math.max(tasks.length, (most - 1) * (n + 1) + tied);
}
