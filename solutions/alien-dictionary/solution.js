/**
 * @param {string[]} words
 * @return {string}
 */
function alienOrder(words) {
  const after = new Map(); // letter -> letters known to come after it
  const need = new Map(); // letter -> how many letters must come before it
  for (const w of words) for (const c of w) if (!after.has(c)) (after.set(c, new Set()), need.set(c, 0));
  for (let i = 0; i + 1 < words.length; i++) {
    const [a, b] = [words[i], words[i + 1]];
    const k = [...a].findIndex((c, j) => c !== b[j]);
    if (k === -1 || k >= b.length) {
      if (a.length > b.length) return ''; // "abc" before "ab" cannot be sorted in any alphabet
      continue;
    }
    // The first difference is the only thing this pair tells us.
    if (!after.get(a[k]).has(b[k])) {
      after.get(a[k]).add(b[k]);
      need.set(b[k], need.get(b[k]) + 1);
    }
  }
  // Kahn's algorithm, as in Course Schedule II.
  const order = [...need.keys()].filter((c) => need.get(c) === 0);
  for (let h = 0; h < order.length; h++) {
    for (const y of after.get(order[h])) {
      need.set(y, need.get(y) - 1);
      if (need.get(y) === 0) order.push(y);
    }
  }
  return order.length === after.size ? order.join('') : ''; // short means a cycle
}
