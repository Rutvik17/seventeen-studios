/**
 * @param {string} beginWord
 * @param {string} endWord
 * @param {string[]} wordList
 * @return {number}
 */
function ladderLength(beginWord, endWord, wordList) {
  const words = new Set(wordList);
  if (!words.has(endWord)) return 0;
  // Breadth-first: every word reached in round k is k steps from the start, the fewest possible.
  let frontier = [beginWord];
  words.delete(beginWord);
  for (let steps = 1; frontier.length; steps++) {
    const next = [];
    for (const w of frontier) {
      if (w === endWord) return steps;
      for (let i = 0; i < w.length; i++) {
        for (let c = 97; c <= 122; c++) {
          // every word one letter away
          const cand = w.slice(0, i) + String.fromCharCode(c) + w.slice(i + 1);
          if (words.has(cand)) {
            words.delete(cand); // reached now, by the shortest route
            next.push(cand);
          }
        }
      }
    }
    frontier = next;
  }
  return 0;
}
