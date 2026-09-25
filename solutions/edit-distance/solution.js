/**
 * @param {string} word1
 * @param {string} word2
 * @return {number}
 */
function minDistance(word1, word2) {
  // d(i, j): edits turning word1[0..i) into word2[0..j). If the last letters match, d(i-1, j-1);
  // otherwise 1 + the cheapest of delete d(i-1, j), insert d(i, j-1), replace d(i-1, j-1).
  const row = Array.from({ length: word2.length + 1 }, (_, j) => j); // from the empty word: j inserts
  for (let i = 1; i <= word1.length; i++) {
    let diag = row[0];
    row[0] = i; // into the empty word: i deletes
    for (let j = 1; j <= word2.length; j++) {
      const above = row[j];
      row[j] = word1[i - 1] === word2[j - 1] ? diag : 1 + Math.min(above, row[j - 1], diag);
      diag = above;
    }
  }
  return row[word2.length];
}
