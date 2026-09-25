/**
 * @param {string} s
 * @return {number[]}
 */
function partitionLabels(s) {
  const last = new Map(); // where each letter appears for the last time
  for (let i = 0; i < s.length; i++) last.set(s[i], i);
  const sizes = [];
  let start = 0;
  let end = 0;
  for (let i = 0; i < s.length; i++) {
    end = Math.max(end, last.get(s[i])); // this part must reach at least that far
    if (i === end) {
      // every letter seen so far is finished: cut here
      sizes.push(end - start + 1);
      start = i + 1;
    }
  }
  return sizes;
}
