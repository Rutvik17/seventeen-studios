/**
 * @param {string} text1
 * @param {string} text2
 * @return {number}
 */
function longestCommonSubsequence(text1, text2) {
  // lcs(i, j) for the first i letters of text1 and j of text2: if the last letters match,
  // 1 + lcs(i - 1, j - 1); otherwise drop one of them, max(lcs(i - 1, j), lcs(i, j - 1)).
  // One row at a time is enough.
  const row = new Array(text2.length + 1).fill(0);
  for (const a of text1) {
    let diag = 0; // lcs(i - 1, j - 1): the old row's value one to the left
    for (let j = 1; j <= text2.length; j++) {
      const above = row[j];
      row[j] = a === text2[j - 1] ? diag + 1 : Math.max(row[j], row[j - 1]);
      diag = above;
    }
  }
  return row[text2.length];
}
