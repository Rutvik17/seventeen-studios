/**
 * @param {string} s
 * @param {string[]} wordDict
 * @return {boolean}
 */
function wordBreak(s, wordDict) {
  const words = new Set(wordDict);
  const longest = Math.max(...wordDict.map((w) => w.length));
  // ok[i]: can s[0..i) be split into words? It can if some word ends at i and
  // the part before that word can be split too.
  const ok = new Array(s.length + 1).fill(false);
  ok[0] = true;
  for (let i = 1; i <= s.length; i++) {
    for (let j = Math.max(0, i - longest); j < i; j++) {
      // no word is longer than `longest`
      if (ok[j] && words.has(s.slice(j, i))) {
        ok[i] = true;
        break;
      }
    }
  }
  return ok[s.length];
}
